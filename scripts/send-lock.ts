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
    DSO,
} from './models';

clientSend();

async function clientSend() {
    const txId = 5;
    const amuletAmount = '60'; // minimum working amount!
    const relayFee = '1';

    // SEND TO CLIENT
    const amuletVaultWithLockCid = process.env.USER_AMULET_WITH_LOCK_CID!;
    const userServiceResult = await exerciseCmd({
        actAs: [clientOwnerParty],
        payload: {
            templateId: amuletVaultWithLockTemplateId,
            contractId: amuletVaultWithLockCid,
            choice: 'AmuletVaultWithLock_CreateUserService',
            choiceArgument: {
                user: userParty,
                walletProvider: transferProvider,
                userOtherAddress: dstChainUserAddress,
                description: 'Test receive from vault with lock'
            },
        }
    }) as DamlRecord;
    console.log('userServiceResult', userServiceResult);

    const amuletVaultUserServiceCid = requireValue(
        userServiceResult['amuletVaultUserService'],
        'undefined amuletVaultUserService'
    ) as DamlParty;

    const sendClientTxIdCid = await createCmd({
        templateId: sendClientTxIdTemplateId,
        actAs: clientOwnerParty,
        createArguments: {
            owner: clientOwnerParty,
            txId: String(txId),
        }
    });
    console.info('sendClientTxIdCid', sendClientTxIdCid);

    const inputHoldingCids = await findInputHoldings(userParty, amuletAmount);
    const { context: makePaymentCtx, disclosedContracts: makePaymentDisclosed } =
        await buildContextAndDisclosed(transferProvider);

    const makePaymentResult = await exerciseCmd({
        actAs: [userParty, transferProvider],
        payload: {
            templateId: amuletVaultUserServiceTemplateId,
            contractId: amuletVaultUserServiceCid,
            choice: 'AmuletVaultUserService_MakePayment',
            choiceArgument: {
                inputs: inputHoldingCids.map((cid) => ({
                    tag: 'InputAmulet',
                    value: cid,
                })),
                context: makePaymentCtx,
                targetAmount: amuletAmount,
                stakeId: String(txId),
                sendClientTxIdCid,
            },
        },
        disclosedContracts: makePaymentDisclosed,
    }) as DamlRecord;
    console.info('makePaymentResult', makePaymentResult);

    const amuletVaultPayment = requireValue(
        makePaymentResult['amuletVaultPayment'],
        'no amuletVaultPayment'
    ) as DamlParty;
    console.info('amuletVaultPayment', amuletVaultPayment);

    const acceptPaymentResult = await exerciseCmd({
        actAs: [clientOwnerParty],
        payload: {
            templateId: amuletVaultWithLockPaymentTemplateId,
            contractId: amuletVaultPayment,
            choice: 'AmuletVaultWithLockPayment_Accept',
            choiceArgument: {
                ccRate: 1
            },
        }
    }) as DamlRecord;
    console.info('acceptPaymentResult', acceptPaymentResult);

    const initEvent = requireValue(acceptPaymentResult['initEvent'] as DamlRecord, 'no initEvent');
    const clientTxIdCid = requireValue(acceptPaymentResult['clientTxIdCid'] as DamlText, 'no next clientTxIdCid');
    const transferAccountCid = requireValue(acceptPaymentResult['transferAccountCid'] as DamlParty, 'no transferAccountCid');
    console.info('next clientTxIdCid for txId=' + (txId + 1), clientTxIdCid);
    // FINISH SEND TO CLIENT

    // START CLIENT -> RELAY
    const clientCid = process.env.CLIENT_CID!;

    const senderInputHoldingCids = await findInputHoldings(clientSenderParty, relayFee);
    const { context: sendCtx, disclosedContracts: sendDisclosed } =
        await buildContextAndDisclosed(transferProvider);

    const sendMessageWithValueRes = await exerciseCmd({
        actAs: [clientSenderParty, transferProvider],
        payload: {
            templateId: clientTemplateId,
            contractId: clientCid,
            choice: 'SendMessageWithValue',
            choiceArgument: {
                sender: clientSenderParty,
                txId: requireValue(initEvent.txId, 'no initEvent.txId'),
                transferHash: requireValue(initEvent.transferHash, 'no initEvent.transferHash'),
                value: relayFee,
                transferAccountCid: transferAccountCid,
                inputs: senderInputHoldingCids.map((cid) => ({
                    tag: 'InputAmulet',
                    value: cid,
                })),
                context: sendCtx,
                dso: DSO,
                walletProvider: transferProvider,
            }
        },
        disclosedContracts: sendDisclosed,
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
                    payload: testSerializePayload(
                        toHex(userParty),
                        testDecimalToIntMultiplied(amuletAmount),
                        BigInt(txId),
                    ),
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
    const clientOwnerFeaturedApp = await getFeaturedApps(clientOwnerParty);

    const openMiningRounds2 = openAndIssuingMiningRound2.open_mining_rounds
        .filter((r: any) => new Date(r.contract.payload.opensAt) <= now2);

    const disclosedContracts2: DisclosedContract[] = [
        ...openMiningRounds2.map((r: any) => ({
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
    });
    console.log('unlockVaultResult', unlockVaultResult);
    // FINISH RECEIVE CLIENT
}

async function buildContextAndDisclosed(walletProviderParty: string): Promise<{
    context: any;
    disclosedContracts: DisclosedContract[];
}> {
    const now = new Date();

    const [openAndIssuing, amuletRules, featured] = await Promise.all([
        getOpenAndIssuingMiningRounds(),
        getAmuletRules(),
        getFeaturedApps(walletProviderParty),
    ]);

    const open = openAndIssuing.open_mining_rounds.filter((r: any) => {
        const p = r.contract.payload;
        return new Date(p.opensAt) <= now && new Date(p.targetClosesAt) >= now;
    });

    const issuing = openAndIssuing.issuing_mining_rounds.filter((r: any) => {
        const p = r.contract.payload;
        return new Date(p.opensAt) <= now && new Date(p.targetClosesAt) >= now;
    });

    if (!open.length) throw new Error('no active openMiningRounds');

    const openMiningRoundCid = open[open.length - 1].contract.contract_id;

    const context = {
        amuletRules: amuletRules.amulet_rules.contract.contract_id,
        context: {
            openMiningRound: openMiningRoundCid,
            issuingMiningRounds: issuing.map((r: any) => ([
                { number: r.contract.payload.round.number },
                r.contract.contract_id,
            ])),
            validatorRights: [],
            featuredAppRight: featured?.featured_app_right?.contract_id ?? null,
        },
    };

    const mapRound = (r: any): DisclosedContract => ({
        templateId: r.contract.template_id,
        contractId: r.contract.contract_id,
        createdEventBlob: r.contract.created_event_blob,
        synchronizerId: r.domain_id,
        debugPackageName: 'splice-amulet',
        debugPayload: r.contract.payload,
        debugCreatedAt: r.contract.created_at,
    });

    const disclosedContracts: DisclosedContract[] = [
        ...open.map(mapRound),
        ...issuing.map(mapRound),
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

    return { context, disclosedContracts };
}
