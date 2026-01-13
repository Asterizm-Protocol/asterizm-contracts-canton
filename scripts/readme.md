## ⚠️ ATTENTION
The API periodically fails. If a call fails but there was an object in the console — comment out the call and manually insert the data.

Example:

```js
// init call
const factoryCid = await createCmd({...});
console.info('factoryCid', factoryCid);
```

If everything broke but the console returned an object or a string or something else, then insert into JS:

```js
const factoryCid = {
  key1: value,
  key2: value,
};
```

---

## 1. Environment setup
Fill in all variables from `.env.example`, except:

```
USER_AMULET_WITH_LOCK_CID
CLIENT_CID
```

---

## 2. Contract deployment
Command:

```bash
npm run deploy
```

Save the output CIDs:

```txt
factoryCid xxxxx
customRelayerCid xxxxx
chainCid xxxxx
dstChainCid xxxxx
trustedAddressCid xxxxx
clientProposalCid xxxxx
clientCid xxxxx
amuletVaultWithLockProposalCid xxxxx
amuletVaultWithLockCid xxxxx
...
```

---

## 3. Fill in the missing variables

```txt
USER_AMULET_WITH_LOCK_CID = amuletVaultWithLockCid
CLIENT_CID = clientCid
```

---

## 4. Client-side transaction sending
Command:

```bash
npm run client-send
```

If something breaks again — **don’t clear the console**, but manually insert the CIDs into the code using the same approach as above.

After a successful transaction, save:

```txt
next clientTxIdCid for txId=2 xxxxx
```

---

## 5. New transactions
If you need to send the next one:

1. Change `txId` → `txId + 1`
2. Update `userServiceResult` with the value from the previous run's console
3. Update `clientTxIdCid` with the value from the previous run's console

---
