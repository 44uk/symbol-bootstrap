# symbol-bootstrap

Symbol CLI tool that allows you creating, configuring and running Symbol&#39;s complete networks or nodes to be sync with existing networks.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/symbol-bootstrap.svg)](https://npmjs.org/package/symbol-bootstrap)
[![Downloads/week](https://img.shields.io/npm/dw/symbol-bootstrap.svg)](https://npmjs.org/package/symbol-bootstrap)
[![License](https://img.shields.io/npm/l/symbol-bootstrap.svg)](https://github.com/nemtech/symbol-bootstrap/blob/master/package.json)
[![Build Status](https://travis-ci.com/nemtech/symbol-bootstrap.svg?branch=main)](https://travis-ci.com/nemtech/symbol-bootstrap)
[![Coverage Status](https://coveralls.io/repos/github/nemtech/symbol-bootstrap/badge.svg?branch=main)](https://coveralls.io/github/nemtech/symbol-bootstrap?branch=main)
[![Api Doc](https://img.shields.io/badge/api-doc-blue.svg)](https://nemtech.github.io/symbol-bootstrap/)


<!-- toc -->
* [symbol-bootstrap](#symbol-bootstrap)
* [Why this tool?](#why-this-tool)
* [Key benefits:](#key-benefits)
* [Concepts](#concepts)
* [Requirements](#requirements)
* [Usage](#usage)
* [E2E Testing support](#e2e-testing-support)
* [Development](#development)
* [Commands](#commands)
* [Command Topics](#command-topics)
<!-- tocstop -->

# Why this tool?

This tool has been created to address the problems defined in Symbol's [NIP11](https://github.com/nemtech/NIP/blob/main/NIPs/nip-0011.md).

It replaces:

-   [catapult-service-bootstrap](https://github.com/nemtech/catapult-service-bootstrap)
-   [symbol-testnet-bootstrap](https://github.com/nemgrouplimited/symbol-service-bootstrap)

# Key benefits:

-   It's an installable cli tool. It's not a repo you need to clone and compile.
-   The configuration is parametrized via CLI commands and presets instead of by changing properties files.
-   The tools code is unique for any type of network, new networks or nodes in a network. It doesn't need to be copied and pasted in different projects or assemblies.
-   The config command runs on the host machine, not via docker making it easier to debug or tune
-   It's uses the TS SDK for key generation, vrf transactions, address generation instead of using catapult-tools (nemgen is still used to generate the nemesis block).
-   Easier to maintain, the properties files are reused for all nodes, assemblies and network types.
-   Network setup (how many database, nodes, rest gateways to run) is defined in presets, users can provide their own ones.
-   Docker-compose yaml files are generated based on the network setup/preset instead of being manually created/upgraded.
-   The created network (config, nemesis and docker-compose) can be zipped and distributed for other host machines to run it.
-   The used docker images versions can be changed via configuration/preset
-   It uses the [oclif](https://oclif.io) framework. New commands are easy to add and document.
-   It can be included as a npm dependency for clients' e2e testing.

# Concepts

## Preset:

Yaml files that define the configuration and layout of the network and nodes. It defines how many nodes, database, rest gateways, the modes, keys, etc.

Presets are defined at 4 levels from general to specific:

-   Shared: Default configurations for all the networks.
-   Network: It defines the main preset of a given network, example: `bootstrap` or `testnet`.
-   Assembly: It defines a modification of a network, example: `testnet peer`, `tesnet dual`, `testnet api`. Assembly is required for some networks (like `testnet`).
-   Custom: A user provided yml file (`--customPreset` param) that could override some or all properties in the out-of-the-box presets.

Properties in each file override the previous values (by object deep merge).

### Out-of-the-box presets:

-   `-p bootstrap`: Default [preset](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/bootstrap/network.yml). It's a full network with 1 mongo database, 2 peers, 1 api and 1 rest gateway. Nemesis block is generated.
-   `-p light`: A [light](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/light/network.yml) network. It's a version of bootstrap with 1 mongo database, 1 dual peer and 1 rest gateway. Great for faster light e2e automatic testing. Nemesis block is generated.
-   `-p testnet -a peer`: A [harvesting](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/assembly-peer.yml) peer node that connects to the current public [testnet](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/network.yml). [Nemesis block](https://github.com/nemtech/symbol-bootstrap/tree/main/presets/testnet/seed/00000) is copied over.
-   `-p testnet -a api`: A [api](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/assembly-api.yml) peer node that connects to the current public [testnet](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/network.yml) running its own mongo database and rest gateway. [Nemesis block](https://github.com/nemtech/symbol-bootstrap/tree/main/presets/testnet/seed/00000) is copied over.
-   `-p testnet -a dual`: A [dual](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/assembly-dual.yml) haversting peer node that connects to the current public [testnet](https://github.com/nemtech/symbol-bootstrap/blob/main/presets/testnet/network.yml) running its own mongo database and rest gateway. [Nemesis block](https://github.com/nemtech/symbol-bootstrap/tree/main/presets/testnet/seed/00000) is copied over.


### Custom preset:

It's the way you can tune the network without modifying the code. It's a yml file (`--customPreset` param) that could override some or all properties in the out-of-the-box presets.

Most people would use the out-of-box preset or tune a few attributes.

The file is a hierarchical yaml object. If an attribute is defined at root level, it overrides the default value for all the affected configurations. 
The attribute can also be defined in a lower level object just affecting one component (node, gateway, nemesis, etc).  

The best way to validate your configuration is by inspecting the generated configuration and preset.yml files in the target folder

**If you are trying new configurations, remember to reset the previous one by running --reset (-r) or by removing the selected target folder (./target by default)**

#### Examples:

##### Custom Rest image and throttling:

````yaml
symbolRestImage: symbolplatform/symbol-rest:2.1.1-alpha
throttlingBurst: 35
throttlingRate: 1000
````

##### Custom block duration, max namespace duration and number of nemesis accounts:

````yaml
blockGenerationTargetTime: 5s
maxNamespaceDuration: 10d
nemesis:
  mosaics:
    - accounts: 20
````

##### Zero fee nodes:

````yaml
minFeeMultiplier: 0
````

##### Not exposed rest gateway:

````yaml
gateways:
    - openPort: false
````

##### Custom nodes' friendly names and hosts:

Updating first node (single node presets like `testnet`):

````yaml
nodes:
  - friendlyName: My node custom friendly name
    host: 'myNode.custom.hostname'
````
Updating multiple nodes (multi-node presets like `bootstrap`)

````yaml
nodes:
  - friendlyName: Peer Node 1 custom friendly name
  - friendlyName: Peer Node 2 custom friendly name
    host: 'peer2.custom.hostname'
  - friendlyName: Api Node 1 custom friendly name
    host: 'api1.custom.hostname'
````

##### Custom generation hash seed, balances and block 1 transactions:

````yaml
nemesisGenerationHashSeed: 7391E2EF993C70D2F52691A54411DA3BD1F77CF6D47B8C8D8832C890069AAAAA
nemesis:
    balances:
        TDN2CNADENSTASFK6SCB7MFQLAYNZB3JBZCBLLA: 898300000
        TBK7C5SI3NR3ZEZTMNXRISY6FENDK3YDE63HK7Q: 98800000
        TA45K3WZYQQKSFHJ3DSEQTOO6N7RMBQUVE7H6MA: 984750000
transactions:
        '16963_581474': A1000000000000...(serialized hex transaction)
        '16963_580690': A1000000000000...
        'MyTransaction': 01000000000000...
````

##### Enable voting mode in a node:

````yaml
nodes:
  - voting: true
````

In order to finalize the peer or voting nodes registration to an existing network like Testnet, be sure your nodes' signing addresses have enough funds. For test environments, you can use the network's faucet.

Then run:

````
symbol-bootstrap link
````

**Note:** Full network `-p bootstrap` nodes are fully configured voting and peer nodes. `VotingKeyLinkTransaction` and `VrfKeyLinkTransaction` are added to the nemesis block automatically. 


##### Disable voting mode in all bootstrap nodes:

````yaml
nodes:
  - voting: false
  - voting: false
````

## Target:

The folder where the generated config, docker files and data are stored. The folder structure is:

-   `./config`: node configurations mounted when running the docker services.
-   `./config/generated-addresses`: randomly generated data that wasn't provided in the preset. e.g.: SSL keys, nodes' keys, nemesis accounts, generation hash seed, etc.
-   `./config/nemesis`: the configuration used when running the `nemgen` tool.
-   `./mongo`: mongo database data
-   `./data`
-   `./data/nemesis-data`: nemesis data the nodes will load. The nemesis can be generated (for new networks like `bootstrap`) or copied from an existing network (`testnet`)
-   `./docker`: the generated docker-compose.yml and DockerFile files used when running the network.
-   `./state`: folder used to synchronize the services execution

# Requirements

-   Node 10+
-   Docker
-   Docker Compose

Validate your environment by running:

```
node -v
docker -v
docker-compose -v
```

Check your user can run docker without sudo:

```
docker run hello-world
```
If you see an error like:

```
Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

Please follow this [guide](https://www.digitalocean.com/community/questions/how-to-fix-docker-got-permission-denied-while-trying-to-connect-to-the-docker-daemon-socket).

# Usage

It's recommended to run the commands from en empty working dir.

The network configuration, data and docker files will be created inside the target folder ('./target') by default.

```
mkdir my-networks
cd my-networks
```

Once in the working dir:

<!-- usage -->
```sh-session
$ npm install -g symbol-bootstrap
$ symbol-bootstrap COMMAND
running command...
$ symbol-bootstrap (-v|--version|version)
symbol-bootstrap/0.1.1 linux-x64 node-v14.8.0
$ symbol-bootstrap --help [COMMAND]
USAGE
  $ symbol-bootstrap COMMAND
...
```
<!-- usagestop -->

The general usage would be:

```
symbol-bootstrap config -p bootstrap
symbol-bootstrap compose
symbol-bootstrap run
```

You can aggregate all these commands with this one liner:

```
symbol-bootstrap start -p bootstrap
```

If you need to start fresh, you many need to sudo remove the target folder (docker volumes dirs may be created using sudo). Example:

```
sudo rm -rf ./target
```

# E2E Testing support

One use case of this CLI is client E2E testing support. If you are coding a Symbol client, you (Travis or Jenkins) can run e2e tests like:

```
symbol-bootstrap start -p bootstrap --detached
YOUR TEST (e.g: npm run test, gradle test, selenium etc.)
symbol-bootstrap stop
```

`--detached` starts the server waiting until it is up (by polling the network http://localhost:3000/node/health). The command will fail if the components are not up in 30 seconds.

You can also provide your own custom preset (`-c`) if you want your e2e test to start with a specific state (specific balances addresses, mosaics, namespaces, generation hash seed, etc.)

## Node client E2E via CLI:

The CLI can also be used as npm project (dev) dependency (`npm install --save-dev symbol-bootstrap`). Then you can integrate the network to your npm test cycle.
Your `package.json` can look like this:

````yaml

"devDependencies": {
    ....
    "symbol-bootstrap": "0.0.x",
    ....
}

scripts": {
...
    "clean-network": "symbol-bootstrap clean",
    "run-network": "symbol-bootstrap start -c ./output/my_custom_preset.yml --detached",
    "run-stop": "symbol-bootstrap stop",
    "integration-test": "....some mocha/jest/etc tests running against localhost:3000 network....",
    "e2e": "npm run clean-network && npm run run-network && npm run integration-test && npm run stop-network",
...
}
````

Then, you, Jenkins, Travis or your CI tool can run;

```
npm run e2e
```


## Node client E2E via API:

Alternatively, you can use the [BootstrapService](https://github.com/nemtech/symbol-bootstrap/blob/main/src/service/BootstrapService.ts) facade to programmatically start and stop a server.

Example:

```ts
it('Bootstrap e2e test', async () => {
    const service = new BootstrapService();
    const config: StartParams = {
        preset: Preset.bootstrap,
        reset: true,
        timeout: 60000 * 5,
        target: 'target/bootstrap-test',
        detached: true,
        user: 'current',
    };
    try {
        await service.stop(config);
        const configResult = await service.start(config);
        expect(configResult.presetData).not.null;
        expect(configResult.addresses).not.null;
        // Here you can write unit tests against a http://localhost:3000 network
    } finally {
        await service.stop(config);
    }
});
```

It's recommended to reuse the same server for multiple tests by using `beforeAll`, `afterAll` kind of statements. 


# Development

If you want to contribute to this tool, clone this repo and run:

```
npm install -g
```

Then, ``symbol-bootstrap`` runs from the source code. You can now try your features after changing the code.

Pull Requests are appreciated! Please follow the contributing [guidelines](CONTRIBUTING.md).

Note: cloning this repo is only for people that want to tune the tool in a way it cannot be configured. If this is your case, please provide a feature request. 
General users should install this tool like any other node module. 

# Commands

<!-- commands -->
# Command Topics

* [`symbol-bootstrap clean`](docs/clean.md) - It removes the target folder (It may not work if you need root privileges!!!)
* [`symbol-bootstrap compose`](docs/compose.md) - It generates the `docker-compose.yml` file from the configured network.
* [`symbol-bootstrap config`](docs/config.md) - Command used to set up the configuration files and the nemesis block for the current network
* [`symbol-bootstrap help`](docs/help.md) - display help for symbol-bootstrap
* [`symbol-bootstrap link`](docs/link.md) - It announces VRF and Voting Link transactions to the network for each node with 'Peer' or 'Voting' roles. This command finalizes the node registration to an existing network.
* [`symbol-bootstrap report`](docs/report.md) - it generates reStructuredText (.rst) reports describing the configuration of each node.
* [`symbol-bootstrap run`](docs/run.md) - It boots the network via docker using the generated `docker-compose.yml` file and configuration. The config and compose methods/commands need to be called before this method. This is just a wrapper for the `docker-compose up` bash call.
* [`symbol-bootstrap start`](docs/start.md) - Single command that aggregates config, compose and run in one line!
* [`symbol-bootstrap stop`](docs/stop.md) - It stops the docker-compose network if running (symbol-bootstrap started with --detached). This is just a wrapper for the `docker-compose down` bash call.

<!-- commandsstop -->
```