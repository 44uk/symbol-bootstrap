/*
 * Copyright 2020 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as _ from 'lodash';
import {
    Account,
    AccountKeyLinkTransaction,
    Deadline,
    LinkAction,
    NodeKeyLinkTransaction,
    RepositoryFactoryHttp,
    Transaction,
    UInt64,
    VrfKeyLinkTransaction,
} from 'symbol-sdk';
import { LogType } from '../logger';
import Logger from '../logger/Logger';
import LoggerFactory from '../logger/LoggerFactory';
import { Addresses, ConfigPreset, NodeAccount } from '../model';
import { AnnounceService } from './AnnounceService';
import { BootstrapUtils } from './BootstrapUtils';
import { ConfigLoader } from './ConfigLoader';

/**
 * params necessary to announce link transactions network.
 */
export type LinkParams = { target: string; readonly password?: string; url: string; maxFee: number; unlink: boolean };

const logger: Logger = LoggerFactory.getLogger(LogType.System);

export class LinkService {
    public static readonly defaultParams: LinkParams = {
        target: BootstrapUtils.defaultTargetFolder,
        url: 'http://localhost:3000',
        maxFee: 100000,
        unlink: false,
    };

    private readonly configLoader: ConfigLoader;

    constructor(protected readonly params: LinkParams) {
        this.configLoader = new ConfigLoader();
    }

    public async run(passedPresetData?: ConfigPreset | undefined, passedAddresses?: Addresses | undefined): Promise<void> {
        const presetData = passedPresetData ?? this.configLoader.loadExistingPresetData(this.params.target, this.params.password);
        const addresses = passedAddresses ?? this.configLoader.loadExistingAddresses(this.params.target, this.params.password);
        const url = this.params.url.replace(/\/$/, '');
        const repositoryFactory = new RepositoryFactoryHttp(url);
        const currency = (await repositoryFactory.getCurrencies().toPromise()).currency;

        logger.info(
            `${this.params.unlink ? 'Unlinking' : 'Linking'} nodes using network url ${url}. Max Fee ${
                this.params.maxFee / Math.pow(10, currency.divisibility)
            }`,
        );
        const generationHash = await repositoryFactory.getGenerationHash().toPromise();
        if (generationHash !== presetData.nemesisGenerationHashSeed) {
            throw new Error(
                `You are connecting to the wrong network. Expected generation hash is ${presetData.nemesisGenerationHashSeed} but got ${generationHash}`,
            );
        }

        const epochAdjustment = await repositoryFactory.getEpochAdjustment().toPromise();
        const transactionNodes = this.createTransactionsToAnnounce(epochAdjustment, addresses, presetData);
        await new AnnounceService().announce(repositoryFactory, presetData, transactionNodes, generationHash);
    }

    public createTransactionsToAnnounce(
        epochAdjustment: number,
        addresses: Addresses,
        presetData: ConfigPreset,
    ): { node: NodeAccount; transactions: Transaction[] }[] {
        return _.flatMap(addresses.nodes || [])
            .filter((node) => node.main && (node.remote || node.voting || node.vrf))
            .map((node) => {
                const transactions = [];
                if (!node.main) {
                    throw new Error('CA private key is required!');
                }
                const account = Account.createFromPrivateKey(node.main.privateKey, presetData.networkType);
                const action = this.params.unlink ? LinkAction.Unlink : LinkAction.Link;

                logger.info(`Creating transactions for node: ${node.name}, ca/main account: ${account.address.plain()}`);

                const deadline = Deadline.create(epochAdjustment);
                const maxFee = UInt64.fromUint(this.params.maxFee);
                if (node.remote) {
                    logger.info(
                        `Creating AccountKeyLinkTransaction - node: ${node.name}, signer public key: ${account.publicKey}, Remote Account public key: ${node.remote.publicKey}`,
                    );
                    transactions.push(
                        AccountKeyLinkTransaction.create(deadline, node.remote.publicKey, action, presetData.networkType, maxFee),
                    );
                    logger.info(
                        `Creating NodeKeyLinkTransaction - node: ${node.name}, signer public key: ${account.publicKey}, Transport/Node Account public key: ${node.transport.publicKey}`,
                    );
                    transactions.push(
                        NodeKeyLinkTransaction.create(deadline, node.transport.publicKey, action, presetData.networkType, maxFee),
                    );
                }

                if (node.vrf) {
                    logger.info(
                        `Creating VrfKeyLinkTransaction - node: ${node.name}, signer public key: ${account.publicKey}, VRF public key: ${node.vrf.publicKey}`,
                    );
                    transactions.push(VrfKeyLinkTransaction.create(deadline, node.vrf.publicKey, action, presetData.networkType, maxFee));
                }
                if (node.voting) {
                    logger.info(
                        `Creating VotingKeyLinkTransaction - node: ${node.name}, signer public key: ${account.publicKey}, Voting public key: ${node.voting.publicKey}`,
                    );
                    transactions.push(
                        BootstrapUtils.createVotingKeyTransaction(node.voting.publicKey, action, presetData, deadline, maxFee),
                    );
                }
                return { node, transactions };
            });
    }
}