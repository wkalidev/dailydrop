import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`\n🚀 Deploying DailyDrop suite on ${network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH/CELO\n`);

  // ─── 1. DailyDrop (ERC20 + check-in natif) ──────────────────────────────────
  console.log("📦 Deploying DailyDrop...");
  const DailyDrop = await ethers.getContractFactory("DailyDrop");
  const dailydrop = await DailyDrop.deploy();
  await dailydrop.waitForDeployment();
  const dailydropAddress = await dailydrop.getAddress();
  console.log(`✅ DailyDrop deployed at:     ${dailydropAddress}`);

  // ─── 2. StreakMaster (source de verite cross-chain) — Base seulement ─────────
  let streakMasterAddress = "";
  let streakNFTAddress    = "";

  if (network.name === "base" || network.name === "baseSepolia") {
    console.log("\n📦 Deploying StreakMaster...");
    const StreakMaster = await ethers.getContractFactory("StreakMaster");
    const streakMaster = await StreakMaster.deploy();
    await streakMaster.waitForDeployment();
    streakMasterAddress = await streakMaster.getAddress();
    console.log(`✅ StreakMaster deployed at:   ${streakMasterAddress}`);

    // ─── 3. StreakNFT (soulbound SVG on-chain) ─────────────────────────────────
    console.log("\n📦 Deploying StreakNFT...");
    const StreakNFT = await ethers.getContractFactory("StreakNFT");
    const streakNFT = await StreakNFT.deploy();
    await streakNFT.waitForDeployment();
    streakNFTAddress = await streakNFT.getAddress();
    console.log(`✅ StreakNFT deployed at:      ${streakNFTAddress}`);

    // ─── 4. Configuration des liens ────────────────────────────────────────────
    console.log("\n🔧 Configuring contracts...");

    await (await streakMaster.setDropContract("base", dailydropAddress)).wait();
    console.log(`   StreakMaster.setDropContract("base", ${dailydropAddress}) ✓`);

    await (await streakMaster.setStreakNFT(streakNFTAddress)).wait();
    console.log(`   StreakMaster.setStreakNFT(${streakNFTAddress}) ✓`);

    await (await streakNFT.setStreakMaster(streakMasterAddress)).wait();
    console.log(`   StreakNFT.setStreakMaster(${streakMasterAddress}) ✓`);

    await (await streakMaster.setRelayer(deployer.address, true)).wait();
    console.log(`   StreakMaster.setRelayer(${deployer.address}, true) ✓`);

    console.log("\n⚠️  IMPORTANT: Add a dedicated relayer wallet:");
    console.log(`   await streakMaster.setRelayer(RELAYER_ADDRESS, true)`);
    console.log(`   await streakMaster.setRelayer(${deployer.address}, false)\n`);
  }

  // ─── 5. DailyDropShield (Proof of Presence layer) ────────────────────────────
  console.log("\n📦 Deploying DailyDropShield...");

  // Adresses des DailyDrop déjà déployés en mainnet
  const CELO_DAILYDROP  = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b";
  const BASE_DAILYDROP  = "0x974fB504172f2aABbecc698Ebf137202a5E4e495";

  // Sur le réseau actuel, on utilise le nouveau contrat déployé
  // et l'adresse mainnet de l'autre chain
  let shieldCeloAddr: string;
  let shieldBaseAddr: string;

  if (network.name === "celo") {
    shieldCeloAddr = dailydropAddress;
    shieldBaseAddr = BASE_DAILYDROP;
  } else if (network.name === "base") {
    shieldCeloAddr = CELO_DAILYDROP;
    shieldBaseAddr = dailydropAddress;
  } else {
    // testnet — use new address for both
    shieldCeloAddr = dailydropAddress;
    shieldBaseAddr = dailydropAddress;
  }

  const DailyDropShield = await ethers.getContractFactory("DailyDropShield");
  const shield = await DailyDropShield.deploy(shieldCeloAddr, shieldBaseAddr);
  await shield.waitForDeployment();
  const shieldAddress = await shield.getAddress();
  console.log(`✅ DailyDropShield deployed at: ${shieldAddress}`);

  // Register deployer as first project (free)
  await (await shield.registerProject("DailyDrop Official")).wait();
  console.log(`   Registered "DailyDrop Official" as first project ✓`);

  // ─── 6. Sauvegarde deployments.json ───────────────────────────────────────
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  let deployments: Record<string, Record<string, string>> = {};
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }
  deployments[network.name] = {
    DailyDrop:        dailydropAddress,
    StreakMaster:     streakMasterAddress,
    StreakNFT:        streakNFTAddress,
    DailyDropShield:  shieldAddress,
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`📝 Saved to deployments.json`);

  // ─── 7. Mise a jour frontend/.env.local ───────────────────────────────────
  const envPath = path.join(__dirname, "../frontend/.env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const envUpdates: Record<string, string> = {
    NEXT_PUBLIC_SHIELD_ADDRESS: shieldAddress,
  };

  if (network.name === "celo") {
    envUpdates["NEXT_PUBLIC_CELO_CONTRACT_ADDRESS"] = dailydropAddress;
  } else if (network.name === "celoAlfajores") {
    envUpdates["NEXT_PUBLIC_CELO_TESTNET_CONTRACT_ADDRESS"] = dailydropAddress;
  } else if (network.name === "base") {
    envUpdates["NEXT_PUBLIC_BASE_CONTRACT_ADDRESS"] = dailydropAddress;
    envUpdates["NEXT_PUBLIC_STREAK_MASTER_ADDRESS"] = streakMasterAddress;
    envUpdates["NEXT_PUBLIC_STREAK_NFT_ADDRESS"]    = streakNFTAddress;
  } else if (network.name === "baseSepolia") {
    envUpdates["NEXT_PUBLIC_BASE_TESTNET_CONTRACT_ADDRESS"] = dailydropAddress;
    envUpdates["NEXT_PUBLIC_STREAK_MASTER_ADDRESS"]         = streakMasterAddress;
    envUpdates["NEXT_PUBLIC_STREAK_NFT_ADDRESS"]            = streakNFTAddress;
  }

  for (const [key, value] of Object.entries(envUpdates)) {
    if (!value) continue;
    if (envContent.includes(key)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
    console.log(`🔧 ${key}=${value}`);
  }

  fs.writeFileSync(envPath, envContent.trim());

  // ─── 8. Recap final ───────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETE                       ║
╠══════════════════════════════════════════════════════════════╣
║  Network:          ${network.name.padEnd(42)}║
║  DailyDrop:        ${dailydropAddress.padEnd(42)}║
${streakMasterAddress ? `║  StreakMaster:     ${streakMasterAddress.padEnd(42)}║\n` : ""}${streakNFTAddress ? `║  StreakNFT:        ${streakNFTAddress.padEnd(42)}║\n` : ""}║  DailyDropShield:  ${shieldAddress.padEnd(42)}║
╚══════════════════════════════════════════════════════════════╝

🛡️  DailyDropShield is live!
   Any project can now call: shield.verify(userAddress, minStreak)
   Register your project:    shield.registerProject("Your Project Name")
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});