import 'crypto';
import {
    DamlParty,
    DamlRecord,
} from './ledger-api';
import {
    initializerFactoryTemplateId,
    managerParty,
    relayOwnerParty,
    cantonChainId,
    systemFee,
    chainTemplateId,
    dstChainId,
    dstChainName,
    clientOwnerParty,
    dstChainTrustedAddress,
    clientProposalTemplateId,
    clientProposalApprovedByRelayerTemplateId,
    clientSenderParty,
    DSO,
    vaultParty,
    amuletVaultWithLockProposalTemplateId,
    clientTemplateId,
    lockVaultProposalTemplateId,
} from './models';
import { createCmd, exerciseCmd, padHex64, queryContractId, requireValue, sha256HexUtf8, toHex } from './functions';

console.log('client address hash (trusted)', sha256HexUtf8(toHex(clientOwnerParty)));
deploy();

async function deploy() {
    const factoryCid = await createCmd({
        templateId: initializerFactoryTemplateId,
        actAs: managerParty,
        createArguments: {
            manager: managerParty,
        }
    });
    console.info('factoryCid', factoryCid);

    const initialize = await exerciseCmd({
        actAs: [managerParty],
        payload: {
            templateId: initializerFactoryTemplateId,
            contractId: factoryCid,
            choice: 'Initialize',
            choiceArgument: {
                systemRelayerOwner: relayOwnerParty,
                localChainId: cantonChainId,
                systemFee,
            }
        }
    }) as DamlRecord;
    console.info('initialize', initialize);

    const customRelayerCid = requireValue(initialize['_1'], 'undefined customRelayerCid') as DamlParty;
    console.info('customRelayerCid', customRelayerCid)

    const chainCid = requireValue(initialize['_2'], 'undefined chainCid') as DamlParty;
    console.info('chainCid', chainCid)

    const dstChainCid = await createCmd({
        templateId: chainTemplateId,
        actAs: managerParty,
        createArguments: {
            id: dstChainId,
            name: dstChainName,
            manager: managerParty,
            chainType: 1,
        }
    });
    console.info('dstChainCid', dstChainCid);

    const trustedAddressCid = requireValue(await exerciseCmd({
        actAs: [managerParty],
        payload: {
            contractId: factoryCid,
            templateId: initializerFactoryTemplateId,
            choice: 'AddTrustedAddress',
            choiceArgument: {
                clientOwner: clientOwnerParty,
                chain: requireValue(
                    await queryContractId({ contractId: dstChainCid, party: managerParty }),
                    'no dst chain'
                ),
                address: padHex64(dstChainTrustedAddress),
            }
        }
    }) as DamlParty, 'no trustedAddressCid');
    console.info('trustedAddressCid', trustedAddressCid);

    const clientProposalCid = requireValue(await createCmd({
        actAs: clientOwnerParty,
        templateId: clientProposalTemplateId,
        createArguments: {
            owner: clientOwnerParty,
            manager: managerParty,
            disableHashValidation: false,
            localChainId: cantonChainId,
            notifyTransferSendingResult: true,
            refundEnabled: true,
            senders: [clientSenderParty],
            customRelayContract: requireValue(
                await queryContractId({ contractId: customRelayerCid, party: managerParty }),
                'no customRelayContract'
            ),
            trustedAddress: requireValue(
                await queryContractId({ contractId: trustedAddressCid, party: managerParty }),
                'no trustedAddress'
            ),
        },
    }) as DamlParty, 'no clientProposalCid');
    console.info('clientProposalCid', clientProposalCid);

    const clientProposalApprovedByRelayerCid = requireValue(await exerciseCmd({
        actAs: [relayOwnerParty],
        payload: {
            templateId: clientProposalTemplateId,
            contractId: clientProposalCid,
            choice: 'ClientProposal_CreateProposalApporvedByRelayer',
            choiceArgument: {
                relayOwner: relayOwnerParty,
            }
        }
    }) as DamlParty, 'no clientProposalApprovedByRelayerCid');
    console.info('clientProposalApprovedByRelayerCid', clientProposalApprovedByRelayerCid);

    const clientCid = requireValue(await exerciseCmd({
        actAs: [managerParty],
        payload: {
            templateId: clientProposalApprovedByRelayerTemplateId,
            contractId: clientProposalApprovedByRelayerCid,
            choice: 'ClientProposalApprovedByRelayer_Accept',
            choiceArgument: {},
        }
    }) as DamlParty, 'no clientCid');
    console.info('clientCid', clientCid);

    const amuletVaultWithLockProposalCid = requireValue(await exerciseCmd({
        actAs: [clientOwnerParty],
        payload: {
            templateId: clientTemplateId,
            contractId: clientCid,
            choice: 'CreateAmuletVaultWithLockProposal',
            choiceArgument: {
                dso: DSO,
                vault: vaultParty,
            }
        }
    }) as DamlParty, 'no amuletVaultWithLockProposalCid');
    console.info('amuletVaultWithLockProposalCid', amuletVaultWithLockProposalCid);

    // TO RUNTIME AMULET_VAULT_WITH_LOCK_CID
    const amuletVaultWithLockCid = requireValue(await exerciseCmd({
        actAs: [vaultParty],
        payload: {
            templateId: amuletVaultWithLockProposalTemplateId,
            contractId: amuletVaultWithLockProposalCid,
            choice: 'AmuletVaultWithLockProposal_Accept',
            choiceArgument: {}
        }
    }), 'no amuletVaultWithLockCid');
    console.info('amuletVaultWithLockCid', amuletVaultWithLockCid);

    const lockDays = 1500;
    
    const lockVaultProposalCid = requireValue(await createCmd({
        actAs: clientOwnerParty,
        templateId: lockVaultProposalTemplateId,
        createArguments: {
            dso: DSO,
            vault: vaultParty,
            clientOwner: clientOwnerParty,
            lockDays,
        },
    }) as DamlParty, 'no lockVaultProposalCid');
    console.info('lockVaultProposalCid', lockVaultProposalCid);

    const lockVaultCid = requireValue(await exerciseCmd({
        actAs: [vaultParty],
        payload: {
            templateId: lockVaultProposalTemplateId,
            contractId: lockVaultProposalCid,
            choice: 'VaultProposal_Accept',
            choiceArgument: {}
        }
    }) as DamlParty, 'no lockVaultCid');
    console.info('lockVaultCid', lockVaultCid);
}
