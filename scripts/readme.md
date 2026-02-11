## ⚠️ Важное предупреждение
API периодически отваливается. Если какой-то вызов упал, но в консоли был объект — комментируем вызов и подставляем данные руками.

Пример:

```js
// исходный вызов
const factoryCid = await createCmd({...});
console.info('factoryCid', factoryCid);
```

Если всё развалилось, но консоль выдала объект или строку или еще что-то, то вставляем в жс:

```js
const factoryCid = {
  key1: value,
  key2: value,
};
```

---

## 1. Настройка окружения
Заполняем все переменные из `.env.example`, кроме:

```
USER_AMULET_WITH_LOCK_CID
CLIENT_CID
```

---

## 2. Деплой контрактов
Команда:

```bash
npm run deploy
```

Сохраняем выведенные CID'ы:

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

## 3. Заполняем недостающие переменные

```txt
USER_AMULET_WITH_LOCK_CID = amuletVaultWithLockCid
CLIENT_CID = clientCid
```

---

## 4. Отправка транзакции клиентом
Команда:

```bash
npm run client-send
```

Если снова что-то сдохло — **не стираем консоль**, а вручную вписываем CID'ы в код по тому же принципу, что и выше.

После успешной транзы сохраняем:

```txt
next clientTxIdCid for txId=2 xxxxx
```

---

## 5. Новые транзакции
Если нужно отправить следующую:

1. Меняем `txId` → `txId + 1`
2. Обновляем `userServiceResult` значением из консоли прошлого запуска
3. Обновляем `clientTxIdCid` значением из консоли прошлого запуска

---
