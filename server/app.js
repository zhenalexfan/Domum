const express = require('express');
const mongoClient = require('mongodb');
const iotaLibrary = require('@iota/core')
const Converter = require('@iota/converter')

const iota = iotaLibrary.composeAPI({
  provider: 'https://nodes.devnet.thetangle.org:443'
});

const app = express();
const port = 3000;

const url = "mongodb://localhost:27017/";
const DB = "apartment";
const DB_COLLECTION = "collection101";

function addHashedData(data, address, seed) {
  const message = Converter.asciiToTrytes(data)
  const transfers = [{
    value: 0,
    address: address, // Where the data is being sent
    message: message // The message converted into trytes
  }]
  return iota
    .prepareTransfers(seed, transfers)
    .then(trytes => iota.sendTrytes(trytes, 3, 9))
    .then(bundle => {
      console.log('Transfer successfully sent')
      bundle.map(tx => console.log(tx))
      return bundle;
    })
    .catch(err => {
      console.log(err)
    })
}

function getHashedData(address) {
  return iota
    .findTransactionObjects({
      addresses: [address]
    })
    .then(response => {
      console.log('Encoded message:')
      console.log(response[0].signatureMessageFragment)
      // Modify trytes into a consumable length
      const trytes = response[0].signatureMessageFragment.slice(0, -1)
      //Convert trytes to plan text
      const data = Converter.trytesToAscii(trytes)
      console.log('Decoded message:')
      console.log(data)
      return data;
    })
    .catch(err => {
      console.error(err)
    })
}

function getBalance(address) {
  return iota.getBalances([address], 100)
    .then(({
      balances
    }) => {
      return balances;
    })
    .catch(err => {
      console.error(err)
    })
}

async function sendTokens(seed, rAddress, value, res) {
    getBalance(seed).then((balance) => {
        const toBeKept = balance[0]-value;
        return Promise.all([
            iota.getNewAddress(seed, {
                index: 1,
                total: 1
              }),
              Promise.resolve(toBeKept)
        ])
    }).then(([receivingAddress, toBeKept]) => {
        console.log(receivingAddress[0])
        console.log(rAddress)
        console.log(toBeKept)
        const transfers = [
            /*{
              value: toBeKept,
              address: receivingAddress[0]
            },*/
            {
                value: value,
                address: rAddress
              }
          ];
          return Promise.all([
                iota.prepareTransfers(seed, transfers)
          ])
    }).then(([trytes]) => {
        return Promise.all([
            iota.sendTrytes(trytes, 3, 9)
        ])
    }).then(([response]) => {
        console.log('Completed TXs')
        response.map(tx => console.log(tx))
        res.send({
            newAddress: rAddress,
            success: true
        });
    })
}

const SEED =
'PUEOTSEITFEVEWCWBTSIZM9NKRGJEIMXTULBACGFRQK9IMGICLBKW9TTEVSDQMGWKBXPVCBMMCXWMNPDX';

var increaseUsage = (req, res) => {
  let roomId = parseInt(req.param('roomId'));
  console.log("req", req.params);
  console.log("roomId", typeof roomId, roomId);
  mongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(DB);
    dbo.collection(DB_COLLECTION).updateOne({
        roomId: roomId
      }, {
        $inc: {
          usage: 1
        }
      },
      { new: true },
      function(err, result) {
        if (err) throw err;
        // console.log(result);
        res.send(JSON.stringify(result));
        db.close();
      }
    );

    dbo.collection(DB_COLLECTION).find({roomId: roomId}).toArray(function(err, result) {
      if (err) throw err;
      console.log("result", result);
      console.log("json", JSON.stringify(result[0]));
      console.log("address", result[0].address);
      addHashedData(JSON.stringify(result[0]), result[0].address, SEED);
    });
  });
};

var getRemaining = (req, res) => {
  let roomId = parseInt(req.query.roomId);
  mongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(DB);
    var query = {
      roomId: roomId
    };
    dbo.collection(DB_COLLECTION).find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result);
      let usage = result[0].usage;
      let address = result[0].address;
      iota
        .getBalances([address], 100)
        .then(({
          balances
        }) => {
          console.log('balances', balances);
          let balance = parseInt(balances[0]);
          // console.log('balance', typeof balance, balance);
          // console.log('usage', typeof usage, usage);
          res.send((balance - usage).toString());
        })
        .catch(err => {
          console.error(err);
          res.sendStatus(404);
        });
      db.close();
    });
  });
};

const SUPPLY_SEED =
  'ROOOMWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOERDLDHRLLOWORL9D'

var sendMoney = (req, res) => {
  let roomId = parseInt(req.query.roomId);
  let value = parseInt(req.query.value);
  mongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(DB);
    var query = {roomId: roomId};
    console.log(roomId, typeof roomId);
    dbo.collection(DB_COLLECTION).find(query).toArray(function(err, result) {
      console.log(result);
      let address = result[0].address;
      sendTokens(SUPPLY_SEED, address, value, res);
    });
  });
}

var getUsage = (req, res) => {
  let roomId = parseInt(req.query.roomId);
  mongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(DB);
    var query = {
      roomId: roomId
    };
    dbo.collection(DB_COLLECTION).find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result);
      let usage = result[0].usage;
      res.send(usage.toString());
      db.close();
    });
  });
}

app.get('/', (req, res) => res.send('Hello World!'));
app.post('/usage', increaseUsage);
app.get('/getusage', getUsage);
app.get('/remaining', getRemaining);
app.post('/send', sendMoney);

app.listen(port, () => console.log(`Apartment listening on port ${port}!`));
// getRemainingService(1);
// increaseUsageService(1);
