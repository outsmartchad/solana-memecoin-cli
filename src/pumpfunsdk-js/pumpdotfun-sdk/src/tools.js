const { AnchorProvider } = require("@coral-xyz/anchor");
const { PumpFunSDK, DEFAULT_DECIMALS } = require("./pumpfun.js");
const {
  sendTxToJito,
  DEFAULT_COMMITMENT,
  generateWalletsAndDropSOL,
  solCollector,
} = require("./util.js");
const { wallet, connection } = require("../../../helpers/config.js"); 
const {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
  getKeypairByJsonPath,
} = require("../example/util");
const fs = require("fs");
const { promises } = require("dns");
const {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const { bs58 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const {
  calculateWithSlippageBuy,
  sendTx,
  getOurWallet,
  getOtherTradersWallet,
  readCSVFile,
  extractPrivateKeyAndSolana,
} = require("./util.js");
const {
  jito_executeAndConfirm,
} = require("./transactions/jito-tx-executor.js");
const path = require("path");
const { get } = require("http");
const SLIPPAGE_BASIS_POINTS = 100n;

async function createAndBuy(pathToMintKeypair, tokenMetadata, initialBuySolAmount) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const sdk = new PumpFunSDK(provider);
  const mintKeypair = getKeypairByJsonPath(pathToMintKeypair);
  console.log(mintKeypair.publicKey);
  await printSOLBalance(connection, wallet.publicKey, "Master wallet keypair");
  let globalAccount = await sdk.getGlobalAccount();
  let bondingCurveAccount = await sdk.getBondingCurveAccount(
    mintKeypair.publicKey
  );
  if (!bondingCurveAccount) {
    // the mint is not exist in pump.fun yet

    let createResults = await sdk.createAndBuy(
      wallet,
      mintKeypair,
      tokenMetadata,
      BigInt(initialBuySolAmount * LAMPORTS_PER_SOL),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 170000, // can be ignored if using jito tips
      }
    );
    if (createResults) {
      console.log(
        "Success:",
        `https://pump.fun/${mintKeypair.publicKey.toBase58()}`
      );
      bondingCurveAccount = await sdk.getBondingCurveAccount(
        mintKeypair.publicKey
      );
      console.log("Bonding curve after create and buy", bondingCurveAccount);
      printSPLBalance(connection, mintKeypair.publicKey, wallet.publicKey);
    }
  } else {
    console.log("boundingCurveAccount", bondingCurveAccount);
    console.log(
      "Success:",
      `https://pump.fun/${mintKeypair.publicKey.toBase58()}`
    );
    printSPLBalance(connection, mintKeypair.publicKey, wallet.publicKey);
  }
}

async function sell(mintPubKey, sellPercentage) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const sdk = new PumpFunSDK(provider);
  let currentTokenBalance = await getSPLBalance(
    connection,
    mintPubKey,
    wallet.publicKey
  );
  console.log("currentTokenBalance", currentTokenBalance);
  if (currentTokenBalance) {
    let sellResults = await sdk.sell(
      wallet,
      mintPubKey,
      BigInt(
        currentTokenBalance * Math.pow(10, DEFAULT_DECIMALS) * sellPercentage
      ),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      }
    );
    if (sellResults.success) {
      await printSPLBalance(connection, mintPubKey, wallet.publicKey);
      console.log(
        "Bonding curve after sell",
        await sdk.getBondingCurveAccount(mintPubKey)
      );
    } else {
      console.log("Sell failed");
    }
  }
}

async function buy(mintPubKey, solPerOrder) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const sdk = new PumpFunSDK(provider);
  let buyResults = await sdk.buy(
    wallet,
    mintPubKey,
    BigInt(solPerOrder * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    }
  );
  if (buyResults.success) {
    printSPLBalance(connection, mintPubKey, wallet.publicKey);
    console.log(
      "Bonding curve after buy",
      await sdk.getBondingCurveAccount(mintPubKey)
    );
  } else {
    console.log("Buy failed");
  }
}



async function run() {

  // Please change your own path
  const pathToSnipersPrivateKey =
    "/Users/chiwangso/Desktop/beta-memecoin-cli/src/pump.fun/pumpdotfun-sdk/src/WalletKeypairs/privateKeys.json";
  const pathToMintKeypair =
    "/Users/chiwangso/Desktop/beta-memecoin-cli/src/pump.fun/pump-keypair/aMSwb4GdCdD7Bo2XbpTiCqHL3NHzqPBVRGj423PQY83.json";
  const tokenAddress = new PublicKey(
    "aMSwb4GdCdD7Bo2XbpTiCqHL3NHzqPBVRGj423PQY83"
  );

  //console.log(wallet.publicKey.toBase58());

  let tokenMetadata = {
    name: "Juice Wrld",
    symbol: "JW",
    description: "YES, how?",
    telegram: "",
    twitter: "",
    website: "",
    file: await fs.openAsBlob(
      "/Users/chiwangso/Desktop/beta-memecoin-cli/src/pumpfunsdk-js/pumpdotfun-sdk/images/999.jpg" // change your own path
    ),
  };


    // buy token with 0.01 SOL
   // await buy(tokenAddress, 0.01);
    // sell token with 100% of the balance
   // await sell(tokenAddress, 1);

  // bundle buy with 3 buyers, it will help to generate three wallets, 
  // if you don't have private keys in pathToSnipersPrivateKey,
  // if you have, it look for the first 3 private keys in pathToSnipersPrivateKey
  //await bundleBuys(5, pathToSnipersPrivateKey, tokenAddress, 0.005, wallet);

  // bundle sell with 3 sellers, it will look for the first 3 private keys in pathToSnipersPrivateKey
  // with 100 percentage of the balance of these mfers, use master to pay the fee
  // await bundleSells(pathToSnipersPrivateKey, tokenAddress, 3, 1, connection, wallet)


  // collet the sol from those mfers to the master wallet
  // await solCollector(connection, wallet, 6, pathToSnipersPrivateKey)

  // create the token and initial buy with 0.01 sol
  // createAndBuy(pathToMintKeypair, tokenMetadata, 0.01);



  
}

//run();

module.exports = {buy, sell, createAndBuy}