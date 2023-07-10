# Models

| Block                |               |
|----------------------|---------------|
| number               | number        |
| parentNumber         | number / null |
| hash                 | string        |
| parentHash           | string        |
| stateRoot            | string        |
| extrinsicsRoot       | string        |
| datetime             | string / null |
| authorAuthorityIndex | number / null |
| authorSlotNumber     | number / null |
| authorAccountId      | string / null |
| countExtrinsics      | number        |
| countEvents          | number        |
| countLogs            | number        |
| countCalls           | number        |
| totalFee             | number / null |
| totalFeeTreasury     | number / null |
| totalFeeBlockAuthor  | number / null |
| specName             | string        |
| specVersion          | number        |
| complete             | number        |
| extrinsics           | Extrinsic[]   |
| events               | Event[]       |

| Header         |        |
|----------------|--------|
| number         | number |
| parentHast     | string |
| stateRoot      | string |
| extrinsicsRoot | string |

| Event          |                        |
|----------------|------------------------|
| blockNumber    | number                 |
| eventIdx       | number                 |
| extrinsicIdx   | number / null          |
| event          | string / null          |
| eventModule    | string / null          |
| eventName      | string / null          |
| eventPhaseIdx  | number / null          |
| eventPhaseName | string / null          |
| attributes     | string / object / null |
| topics         | string / null          |
| blockDatetime  | string / null          |
| blockHash      | string                 |
| specName       | string / null          |
| specVersion    | number / null          |
| complete       | number                 |

| AccountEvent  |               |
|---------------|---------------|
| blockNumber   | number        |
| eventIdx      | number        |
| attributeName | string        |
| accountId     | string        |
| attributes    | string / null |
| pallet        | string        |
| eventName     | string        |
| blockDatetime | string / null |
| sortValue     | number / null |
| extrinsicIdx  | number / null |

| Account |        |
|---------|--------|
| id      | string |
| nonce   | number |
| data    | object |

| AccountJudgement |         |
|------------------|---------|
| isUnknown        | boolean |
| isFeePaid        | boolean |
| asFeePaid        | number  |
| isReasonable     | boolean |
| isKnownGood      | boolean |
| isOutOfDate      | boolean |
| isLowQuality     | boolean |
| isErroneous      | boolean |
| type             | string  |

| AccountIdentity |                    |
|-----------------|--------------------|
| display         | string             |
| displayParent   | string             |
| email           | string             |
| image           | string             |
| legal           | string             |
| other           | Record             |
| parent          | string             |
| pgp             | string             |
| riot            | string             |
| twitter         | string             |
| web             | string             |
| judgements      | AccountJudgement[] |

| AccountInformation |                 |
|--------------------|-----------------|
| accountId          | string          |
| accountIndex       | number          |
| identity           | AccountIdentity |
| nickname           | string          |

| AccountFlags    |         |
|-----------------|---------|
| isCouncil       | boolean |
| isSociety       | boolean |
| isSudo          | boolean |
| isTechCommittee | boolean |

| Extrinsic                |                        |
|--------------------------|------------------------|
| blockNumber              | number                 |
| extrinsicIdx             | number                 |
| hash                     | string / null          |
| version                  | number / null          |
| versionInfo              | number / null          |
| call                     | number / null          |
| callModule               | string / null          |
| callName                 | string / null          |
| callArguments            | string / object / null |
| callHash                 | string / null          |
| signed                   | number / null          |
| multiAddressType         | string / null          |
| multiAddressAccountId    | string / null          |
| multiAddressAccountIndex | number / null          |
| multiAddressRaw          | string / null          |
| multiAddressAddress32    | string / null          |
| multiAddressAddress20    | string / null          |
| signature                | string / null          |
| signatureVersion         | number / null          |
| extrinsicLength          | number / null          |
| nonce                    | number / null          |
| era                      | string / null          |
| eraImmortal              | number / null          |
| eraBirth                 | number / null          |
| eraDeath                 | number / null          |
| feeTotal                 | number / null          |
| feeTreasury              | number / null          |
| feeBlockAuthor           | number / null          |
| tip                      | number / null          |
| weight                   | number / null          |
| error                    | string / null          |
| errorModuleIdx           | number / null          |
| errorModule              | string / null          |
| errorNameIdx             | number / null          |
| errorName                | string / null          |
| blockDatetime            | string / null          |
| blockHash                | string / null          |
| specName                 | string / null          |
| specVersion              | number / null          |
| complete                 | number                 |

| Runtime               |               |
|-----------------------|---------------|
| specName              | string        |
| specVersion           | number        |
| implName              | string / null |
| implVersion           | number / null |
| authoringVersion      | number / null |
| countCallFunctions    | number        |
| countEvents           | number        |
| countPallets          | number        |
| countStorageFunctions | number        |
| countConstants        | number        |
| countErrors           | number        |
| blockNumber           | number        |
| blockHash             | string        |

| RuntimeCall    |               |
|----------------|---------------|
| specName       | string        |
| specVersion    | number        |
| pallet         | string        |
| callName       | string        |
| palletCallIdx  | number        |
| lookup         | string        |
| documentation  | string / null |
| countArguments | number        |

| RuntimeCallArgument  |               |
|----------------------|---------------|
| specName             | string        |
| specVersion          | number        |
| pallet               | string        |
| callName             | string        |
| callArgumentIdx      | number        |
| name                 | string / null |
| scaleType            | string / null |
| scaleTypeComposition | string / null |

| RuntimeConstant      |               |
|----------------------|---------------|
| specName             | string        |
| specVersion          | number        |
| pallet               | string        |
| constantName         | string        |
| palletConstantIdx    | number        |
| scaleType            | string / null |
| scaleTypeComposition | string / null |
| value                | any / null    |
| documentation        | string / null |

| RuntimeErrorMessage |               |
|---------------------|---------------|
| specName            | string        |
| specVersion         | number        |
| pallet              | string        |
| errorName           | string / null |
| palletIdx           | number        |
| errorIdx            | number        |
| documentation       | string / null |

| RuntimeEvent    |               |
|-----------------|---------------|
| specName        | string        |
| specVersion     | number        |
| pallet          | string        |
| eventName       | string / null |
| palletEventIdx  | number        |
| lookup          | string        |
| documentation   | string / null |
| countAttributes | number        |

| RuntimeEventAttribute |               |
|-----------------------|---------------|
| specName              | string        |
| specVersion           | number        |
| pallet                | string        |
| eventName             | string / null |
| eventAttributeName    | string        |
| scaleType             | string / null |
| scaleTypeComposition  | string / null |

| RuntimePallet         |               |
|-----------------------|---------------|
| specName              | string        |
| specVersion           | number        |
| pallet                | string        |
| prefix                | string / null |
| name                  | string / null |
| countCallFunctions    | number        |
| countStorageFunctions | number        |
| countEvents           | number        |
| countConstants        | number        |
| countErrors           | number        |

| RuntimeStorage   |               |
|------------------|---------------|
| specName         | string        |
| specVersion      | number        |
| pallet           | string        |
| storageName      | string        |
| palletStorageIdx | number        |
| default          | string / null |
| modifier         | string / null |
| keyPrefixPallet  | string / null |
| keyPrefixName    | string / null |
| key1ScaleType    | string / null |
| key1Hasher       | string / null |
| key2ScaleType    | string / null |
| key2Hasher       | string / null |
| valueScaleType   | string / null |
| isLinked         | boolean       |
| documentation    | string / null |

| Log           |               |
|---------------|---------------|
| blockNumber   | number        |
| logIdx        | number        |
| typeId        | number / null |
| typeName      | string / null |
| data          | string        |
| blockDatetime | string / null |
| blockHash     | string        |
| specName      | string / null |
| specVersion   | string / null |
| complete      | number        |

| TaggedAccount    |               |
|------------------|---------------|
| accountId        | string        |
| tagName          | string        |
| tagType          | string        |
| tagSubType       | string        |
| riskLevel        | number        |
| riskLevelVerbose | string / null |
| originatorInfo   | object / null |
| beneficiaryInfo  | object / null |

| ChainProperties |               |
|-----------------|---------------|
| chainSS58       | number        |
| chainDecimals   | number[]      |
| chainTokens     | string[]      |
| name            | string        |
| displayName     | string        |
| systemName      | string        |
| specName        | string / null |
| blockTime       | number / null |
