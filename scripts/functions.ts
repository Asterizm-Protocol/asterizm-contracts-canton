import dayjs from 'dayjs';
import { DamlRecord, DamlValue, DisclosedContract, ExerciseCommandPayload, getActiveContracts, getEventsByContractId, getLedgerEnd, getTransactionTreeById, getTransferFactory, MetaValues, submitAndWait, SubmitAndWaitResponse } from './ledger-api';
import { DSO, holdingInterface, InitMessage, instrumentId, synchronizerId, transferFactoryTemplateId } from './models';
import { createHash } from 'crypto';
import Decimal from 'decimal.js';

export function toHex(payload: unknown): string {
    if (typeof payload === 'string') {
        return Buffer.from(payload, 'utf8')
            .toString('hex')
            .toLowerCase();
    }

    if (typeof payload !== 'number' && typeof payload !== 'bigint') {
        throw new Error('unknown type');
    }

    let n = BigInt(payload);
    if (n === 0n) return '0000000000000000';

    const bytes = [];
    while (n > 0n) {
        bytes.push(Number(n & 0xffn));
        n >>= 8n;
    }
    bytes.reverse();

    let hex = '';
    for (const b of bytes) {
        hex += b.toString(16).padStart(2, '0');
    }

    if (hex.length > 16) {
        throw new Error("big size");
    }

    return hex.padStart(16, '0');
}

export function testSerializePayload(
    address: string,
    amount: bigint,
    txId: bigint,
): string {
    return (
        toHex(0n) + toHex(0n) + toHex(0n) +
        toHex(txId) +
        toHex(0n) + toHex(0n) + toHex(0n) +
        toHex(amount) +
        address
    );
}

export function testDecimalToIntMultiplied(input: string): bigint {
    const [intPart, fracPartRaw] = input.split(".");

    const fracPart = (fracPartRaw ?? "").padEnd(10, "0").slice(0, 10);

    return BigInt(intPart + fracPart);
}

export function serializeInitMessage(m: InitMessage): string {
    return (
        m.srcChainId +
        m.srcAddress +
        m.dstChainId +
        m.dstAddress +
        m.txId +
        m.payload
    );
}

export function sha256HexUtf8(str: string): string {
    return createHash('sha256')
        .update(str, 'hex')
        .digest('hex')
}

export function requireValue<T>(value: T | null | undefined, msg?: string): T {
    if (value === null || value === undefined) {
        throw new Error(msg ?? "Required value is undefined");
    }
    return value;
}

type queryContractIdParams = {
    contractId: string,
    party: string,
}

export async function queryContractId({ contractId, party }: queryContractIdParams): Promise<DamlValue> {
    const resp = await getEventsByContractId(contractId, party);
    if (!resp.created || !resp.created.createdEvent.createArgument) {
        throw new Error('undefined created argument');
    }

    return resp.created.createdEvent.createArgument;
}

type exerciseCmdParams = {
    actAs: string[],
    readAs?: string[],
    userId?: string,
    payload: ExerciseCommandPayload,
    disclosedContracts?: Array<DisclosedContract>,
}

export async function exerciseCmd({ actAs, readAs, userId, payload, disclosedContracts }: exerciseCmdParams): Promise<DamlValue> {
    const result = await submitAndWait({
        actAs: actAs,
        readAs: readAs,
        userId: userId,
        commandId: `exercise-cmd-${crypto.randomUUID()}`,
        synchronizerId,
        commands: [
            {
                ExerciseCommand: payload,
            }
        ],
        disclosedContracts,
    });
    if (!result || !result.updateId) {
        throw new Error('undefined result');
    }

    const tree = await getTransactionTreeById(result.updateId, actAs);
    if (!tree || !tree.transaction) {
        throw new Error('undefined tree');

    }

    for (const key in tree.transaction.eventsById) {
        const event = tree.transaction.eventsById[key];
        if (!('ExercisedTreeEvent' in event)) {
            continue;
        }

        const exEvent = event.ExercisedTreeEvent.value;
        if (exEvent.contractId !== payload.contractId || exEvent.choice !== payload.choice) {
            continue;
        }

        if (exEvent.exerciseResult === undefined) {
            continue;
        }

        return exEvent.exerciseResult;
    }

    throw new Error('undefined result')
}

type createCmdParams = {
    templateId: string,
    actAs: string,
    createArguments: DamlValue,
}

export async function createCmd({ templateId, actAs, createArguments }: createCmdParams): Promise<string> {
    const result = await submitAndWait({
        actAs: [actAs],
        commandId: `create-cmd-${crypto.randomUUID()}`,
        synchronizerId,
        commands: [
            {
                CreateCommand: {
                    templateId,
                    createArguments,
                }
            }
        ],
    });

    if (!result || !result.completionOffset) {
        throw new Error('undefined result');
    }

    const acs = await getActiveContracts({
        filter: {
            filtersByParty: {
                [actAs]: {
                    cumulative: [{
                        identifierFilter: {
                            TemplateFilter: {
                                value: {
                                    templateId,
                                    includeCreatedEventBlob: true,
                                }
                            }
                        }
                    }],
                },
            },
        },
        verbose: true,
        activeAtOffset: result.completionOffset,
    }, { limit: 100 })

    for (const item of acs) {
        const entry = item.contractEntry;
        if (!('JsActiveContract' in entry)) continue;

        const created = entry.JsActiveContract.createdEvent;

        if (created.templateId === templateId && created.offset === result.completionOffset) {
            return created.contractId;
        }
    }

    throw new Error(
        `created contract not found for templateId=${templateId} at offset=${result.completionOffset}`,
    );
}

export async function transfer(from: string, to: string, amount: string, reason?: string): Promise<SubmitAndWaitResponse> {
    const inputHoldingCids = await findInputHoldings(from, amount);
    const now = dayjs();
    const metaValues: Record<string, unknown> = {};
    if (reason) {
        metaValues['splice.lfdecentralizedtrust.org/reason'] = reason;
    }
    const transferArgs = {
        expectedAdmin: DSO,
        transfer: {
            sender: from,
            receiver: to,
            amount,
            instrumentId: instrumentId,
            lock: null,
            requestedAt: now.toISOString(),
            executeBefore: now.add(24, "hour").toISOString(),
            inputHoldingCids,
            meta: { values: metaValues },
        },
        extraArgs: {
            context: { values: {} },
            meta: { values: {} },
        },
    };
    const transferFactoryRes = await getTransferFactory(transferArgs);

    const factoryId = transferFactoryRes.factoryId;
    const disclosedContracts = transferFactoryRes.choiceContext.disclosedContracts as Array<DisclosedContract>;
    const synchronizerId = getSynchronizerIdFromDisclosedContracts(disclosedContracts);
    const commandId = `transfer-${crypto.randomUUID()}`;

    transferArgs.extraArgs.context = transferFactoryRes.choiceContext.choiceContextData as MetaValues;
    return await submitAndWait({
        actAs: [from],
        readAs: [from],
        commandId,
        synchronizerId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: transferFactoryTemplateId,
                    contractId: factoryId,
                    choice: 'TransferFactory_Transfer',
                    choiceArgument: transferArgs,
                }
            }
        ],
        disclosedContracts,
    })
}

export async function findInputHoldings(sender: string, amount: string): Promise<Array<string>> {
    const offset = (await getLedgerEnd()).offset;
    const holdingAcs = await getActiveContracts({
        filter: {
            filtersByParty: {
                [sender]: {
                    cumulative: [
                        {
                            identifierFilter: {
                                InterfaceFilter: {
                                    value: {
                                        interfaceId: holdingInterface,
                                        includeInterfaceView: true,
                                        includeCreatedEventBlob: true,
                                    },
                                },
                            }
                        }
                    ]
                }
            }
        },
        verbose: false,
        activeAtOffset: offset
    }, { limit: 100 })

    const inputHoldingCids = [];
    let holdingsAmount = new Decimal(0);
    const target = new Decimal(amount);

    for (const event of holdingAcs) {
        if (!('JsActiveContract' in event.contractEntry)) {
            continue;
        }

        const createdEvent = event.contractEntry.JsActiveContract.createdEvent;

        if (createdEvent.templateId.indexOf('Splice.Amulet:LockedAmulet') > -1) {
            continue;
        }

        if (!('createArgument' in createdEvent)) {
            continue;
        }

        const createArgument = createdEvent.createArgument as DamlRecord;
        const amount = createArgument?.amount;

        if (!amount || typeof amount !== 'object' || amount === null || !('initialAmount' in amount)) {
            continue;
        }

        const holdingCid = createdEvent.contractId;
        const initialAmountStr = (amount as DamlRecord).initialAmount as string;

        const initialAmount = new Decimal(initialAmountStr);

        if (holdingsAmount.greaterThanOrEqualTo(target)) {
            break;
        }

        inputHoldingCids.push(holdingCid);
        holdingsAmount = holdingsAmount.plus(initialAmount);
    }

    if (!holdingsAmount.greaterThanOrEqualTo(target)) {
        throw new Error('not enough funds to send');
    }

    return inputHoldingCids;
}

function getSynchronizerIdFromDisclosedContracts(disclosedContracts: Array<DisclosedContract>): string {
    const synchronizerId = disclosedContracts[0].synchronizerId;
    const differentSynchronizerId = disclosedContracts.find(
        (dc) => dc.synchronizerId !== synchronizerId,
    );
    if (differentSynchronizerId) {
        throw new Error(
            `Contract is in a different domain so can't submit to the correct synchronizer: ${JSON.stringify(
                differentSynchronizerId,
            )}`,
        );
    }
    return synchronizerId;
}

export function padHex64(hex: string): string {
    const h = hex.startsWith('0x') ? hex.slice(2) : hex;

    if (h.length > 64) {
        throw new Error('hex string is longer than 64 chars');
    }

    return h.padStart(64, '0');
}