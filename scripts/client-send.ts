import {
    testSerializePayload,
    toHex,
    testDecimalToIntMultiplied,
    sha256HexUtf8,
    serializeInitMessage,
    requireValue,
    exerciseCmd,
    createCmd,
    findInputHoldings,
    padHex64,
} from './functions';
import {
    DamlParty,
    DamlRecord,
    DamlText,
    DisclosedContract,
    getAmuletRules,
    getFeaturedApps,
    getOpenAndIssuingMiningRounds,
} from './ledger-api';
import {
    amuletVaultUserServiceTemplateId,
    amuletVaultWithLockPaymentTemplateId,
    amuletVaultWithLockTemplateId,
    cantonChainId,
    clientOwnerParty,
    clientSenderParty,
    clientTemplateId,
    dstChainId,
    dstChainTrustedAddress,
    dstChainUserAddress,
    relayOwnerParty,
    sendClientTxIdTemplateId,
    transferProvider,
    userParty,
} from './models';

clientSend();

async function clientSend() {
    const txId = 6;
    // const stakeId = Math.floor(Date.now() / 1000);
    const stakeId = txId;
    console.log('stakeId', stakeId)

    const amuletAmount = '60'; // minimum working amount!

    // SEND TO CLIENT
    const amuletVaultWithLockCid = process.env.USER_AMULET_WITH_LOCK_CID!
    const userServiceResult =  {
        amuletVaultUserService: '00a16524f1e66d3eeea1582c4582c5bd96525791c8dd1cdecbad409472dd41a29bca1212204414481b185ff29b23445730e954bbc4d77a828bf7f3444df51118011df4c11a'
    };
    console.log('userServiceResult', userServiceResult);

    const amuletVaultUserServiceCid = requireValue(userServiceResult['amuletVaultUserService'], 'undefined amuletVaultUserService') as DamlParty;

    const sendClientTxIdCid = '000919b23b2ee1734595480a453058966993255d0f42e187ed709bd22bcbeb5480ca121220f1e80f01eb6a11b9a94e0058c35d93f6691bc577894f646c4a4ca7624bca14ba';
    console.info('sendClientTxIdCid', sendClientTxIdCid);

    const inputHoldingCids = await findInputHoldings(userParty, amuletAmount);
    const openAndIssuingMiningRound = await getOpenAndIssuingMiningRounds();
    const amuletRules = await getAmuletRules();
    const now = new Date();
    const openMiningRounds = openAndIssuingMiningRound.open_mining_rounds
        .filter(r => {
            const p = r.contract.payload
            return new Date(p.opensAt) <= now &&
                new Date(p.targetClosesAt) >= now
        })

    const issuingRounds = openAndIssuingMiningRound.issuing_mining_rounds
        .filter(r => {
            const p = r.contract.payload
            return new Date(p.opensAt) <= now &&
                new Date(p.targetClosesAt) >= now
        })

    const disclosedContracts: DisclosedContract[] = [
        ...openMiningRounds.map((r) => ({
            templateId: r.contract.template_id,
            contractId: r.contract.contract_id,
            createdEventBlob: r.contract.created_event_blob,
            synchronizerId: r.domain_id,
            debugPackageName: 'splice-amulet',
            debugPayload: r.contract.payload,
            debugCreatedAt: r.contract.created_at,
        })),

        ...issuingRounds.map((r) => ({
            templateId: r.contract.template_id,
            contractId: r.contract.contract_id,
            createdEventBlob: r.contract.created_event_blob,
            synchronizerId: r.domain_id,
            debugPackageName: 'splice-amulet',
            debugPayload: r.contract.payload,
            debugCreatedAt: r.contract.created_at,
        })),

        {
            templateId: amuletRules.amulet_rules.contract.template_id,
            contractId: amuletRules.amulet_rules.contract.contract_id,
            createdEventBlob: amuletRules.amulet_rules.contract.created_event_blob,
            synchronizerId: amuletRules.amulet_rules.domain_id,
            debugPackageName: 'splice-amulet',
            debugPayload: amuletRules.amulet_rules.contract.payload,
            debugCreatedAt: amuletRules.amulet_rules.contract.created_at,
        },
    ];

    const makePaymentResult = await exerciseCmd({
        actAs: [userParty, transferProvider],
        payload: {
            templateId: amuletVaultUserServiceTemplateId,
            contractId: amuletVaultUserServiceCid,
            choice: 'AmuletVaultUserService_MakePayment',
            choiceArgument: {
                inputs: inputHoldingCids.map((cid) => ({
                    tag: "InputAmulet",
                    value: cid,
                })),
                context: {
                    amuletRules: amuletRules.amulet_rules.contract.contract_id,
                    context: {
                        openMiningRound: openMiningRounds[openMiningRounds.length - 1].contract.contract_id,
                        issuingMiningRounds: issuingRounds.map(r => ([
                            { number: r.contract.payload.round.number },
                            r.contract.contract_id,
                        ])),
                        validatorRights: [],
                        featuredAppRight: (await getFeaturedApps(transferProvider))?.featured_app_right?.contract_id ?? null,
                    },
                },
                walletProvider: transferProvider,
                targetAmount: amuletAmount,
                stakeId: String(stakeId),
                sendClientTxIdCid,
            },
        },
        disclosedContracts,
    }) as DamlRecord;
    console.info('makePaymentResult', makePaymentResult)

    const amuletVaultPayment = requireValue(makePaymentResult['amuletVaultPayment'], 'no amuletVaultPayment') as DamlParty;
    const acceptPaymentResult = await exerciseCmd({
        actAs: [clientOwnerParty],
        payload: {
            templateId: amuletVaultWithLockPaymentTemplateId,
            contractId: amuletVaultPayment,
            choice: 'AmuletVaultWithLockPayment_Accept',
            choiceArgument: {},
        }
    }) as DamlRecord;
    console.info('acceptPaymentResult', acceptPaymentResult);

    const initEvent = requireValue(acceptPaymentResult['initEvent'] as DamlRecord, 'no initEvent');
    const clientTxIdCid = requireValue(acceptPaymentResult['clientTxIdCid'] as DamlText, 'no next clientTxIdCid');
    const transferAccountCid = requireValue(acceptPaymentResult['transferAccountCid'] as DamlParty, 'no transferAccountCid');
    console.info('next clientTxIdCid for txId=' + (txId + 1), clientTxIdCid);
    // FINISH SEND TO CLIENT
return;
    // START CLIENT -> RELAY
    const clientCid = process.env.CLIENT_CID!
    const sendMessageWithValueRes = await exerciseCmd({
        actAs: [clientSenderParty],
        payload: {
            templateId: clientTemplateId,
            contractId: clientCid,
            choice: 'SendMessageWithValue',
            choiceArgument: {
                sender: clientSenderParty,
                txId: requireValue(initEvent.txId, 'no initEvent.txId'),
                transferHash: requireValue(initEvent.transferHash, 'no initEvent.transferHash'),
                value: 0.2,
                transferAccountCid: transferAccountCid,
            }
        }
    }) as DamlRecord;
    console.info('sendMessageWithValueRes', sendMessageWithValueRes);
    // FINISH CLIENT -> RELAY

    // START RELAY -> CLIENT
    const transferMessageRes = await exerciseCmd({
        actAs: [relayOwnerParty],
        payload: {
            templateId: clientTemplateId,
            contractId: clientCid,
            choice: 'TransferMessage',
            choiceArgument: {
                relayOwner: relayOwnerParty,
                txId: String(txId),
                transferHash: sha256HexUtf8(serializeInitMessage({
                    dstAddress: sha256HexUtf8(toHex(clientOwnerParty)),
                    srcAddress: sha256HexUtf8(toHex(dstChainTrustedAddress)),
                    srcChainId: toHex(Number(dstChainId)),
                    dstChainId: toHex(Number(cantonChainId)),
                    txId: toHex(txId),
                    payload: testSerializePayload(toHex(userParty), testDecimalToIntMultiplied(amuletAmount), BigInt(txId)),
                })),
                transferAccountCid: null,
            }
        }
    }) as DamlRecord;
    console.info('transferMessageRes', transferMessageRes);
    const payloadReceivedFromClient = requireValue(transferMessageRes['_1'], 'no payloadReceivedFromClient');
    const transferAccountFromClient = requireValue(transferMessageRes['_2'], 'no transferAccountFromClient');
    // FINISH RELAY -> CLIENT

    // START RECEIVE CLIENT
    const amuletRules2 = await getAmuletRules();
    const openAndIssuingMiningRound2 = await getOpenAndIssuingMiningRounds();
    const now2 = new Date();
    const clientOwnerFeaturedApp = await getFeaturedApps(clientOwnerParty)
    const openMiningRounds2 = openAndIssuingMiningRound2.open_mining_rounds
        .filter(r => new Date(r.contract.payload.opensAt) <= now2);

    const disclosedContracts2: DisclosedContract[] = [
        ...openMiningRounds2.map((r) => ({
            templateId: r.contract.template_id,
            contractId: r.contract.contract_id,
            createdEventBlob: r.contract.created_event_blob,
            synchronizerId: r.domain_id,
            debugPackageName: 'splice-amulet',
            debugPayload: r.contract.payload,
            debugCreatedAt: r.contract.created_at,
        })),
        {
            templateId: amuletRules2.amulet_rules.contract.template_id,
            contractId: amuletRules2.amulet_rules.contract.contract_id,
            createdEventBlob: amuletRules2.amulet_rules.contract.created_event_blob,
            synchronizerId: amuletRules2.amulet_rules.domain_id,
            debugPackageName: 'splice-amulet',
            debugPayload: amuletRules2.amulet_rules.contract.payload,
            debugCreatedAt: amuletRules2.amulet_rules.contract.created_at,
        },
    ];

    const unlockVaultResult = await exerciseCmd({
        actAs: [clientOwnerParty],
        payload: {
            templateId: amuletVaultWithLockPaymentTemplateId,
            contractId: amuletVaultPayment,
            choice: 'AmuletVaultWithLock_UnlockToUser',
            choiceArgument: {
                transferContext: {
                    amuletRules: amuletRules2.amulet_rules.contract.contract_id,
                    openMiningRound: openMiningRounds2[openMiningRounds2.length - 1].contract.contract_id,
                    featuredAppRight: clientOwnerFeaturedApp?.featured_app_right?.contract_id ?? null
                },
                txId: txId,
                transferAccountCid: transferAccountFromClient,
            },
        },
        disclosedContracts: disclosedContracts2,
    })
    console.log('unlockVaultResult', unlockVaultResult);
    // FINISH RECEIVE CLIENT
}
