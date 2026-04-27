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

    // StreakMaster connait le contrat DROP sur Base
    await (await streakMaster.setDropContract("base", dailydropAddress)).wait();
    console.log(`   StreakMaster.setDropContract("base", ${dailydropAddress}) ✓`);

    // StreakMaster connait le NFT
    await (await streakMaster.setStreakNFT(streakNFTAddress)).wait();
    console.log(`   StreakMaster.setStreakNFT(${streakNFTAddress}) ✓`);

    // StreakNFT connait le Master
    await (await streakNFT.setStreakMaster(streakMasterAddress)).wait();
    console.log(`   StreakNFT.setStreakMaster(${streakMasterAddress}) ✓`);

    // Le deployer devient relayer par defaut (a remplacer par un wallet dedie)
    await (await streakMaster.setRelayer(deployer.address, true)).wait();
    console.log(`   StreakMaster.setRelayer(${deployer.address}, true) ✓`);

    console.log("\n⚠️  IMPORTANT: Add a dedicated relayer wallet:");
    console.log(`   await streakMaster.setRelayer(RELAYER_ADDRESS, true)`);
    console.log(`   await streakMaster.setRelayer(${deployer.address}, false) // remove deployer\n`);
  }

  // ─── 5. Sauvegarde deployments.json ───────────────────────────────────────
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  let deployments: Record<string, Record<string, string>> = {};
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }
  deployments[network.name] = {
    DailyDrop:     dailydropAddress,
    StreakMaster:  streakMasterAddress,
    StreakNFT:     streakNFTAddress,
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`📝 Saved to deployments.json`);

  // ─── 6. Mise a jour frontend/.env.local ───────────────────────────────────
  const envPath = path.join(__dirname, "../frontend/.env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const envUpdates: Record<string, string> = {};

  if (network.name === "celo") {
    envUpdates["NEXT_PUBLIC_CELO_CONTRACT_ADDRESS"] = dailydropAddress;
  } else if (network.name === "celoAlfajores") {
    envUpdates["NEXT_PUBLIC_CELO_TESTNET_CONTRACT_ADDRESS"] = dailydropAddress;
  } else if (network.name === "base") {
    envUpdates["NEXT_PUBLIC_BASE_CONTRACT_ADDRESS"]    = dailydropAddress;
    envUpdates["NEXT_PUBLIC_STREAK_MASTER_ADDRESS"]    = streakMasterAddress;
    envUpdates["NEXT_PUBLIC_STREAK_NFT_ADDRESS"]       = streakNFTAddress;
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

  // ─── 7. Recap final ───────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETE                       ║
╠══════════════════════════════════════════════════════════════╣
║  Network:      ${network.name.padEnd(46)}║
║  DailyDrop:    ${dailydropAddress.padEnd(46)}║
${streakMasterAddress ? `║  StreakMaster: ${streakMasterAddress.padEnd(46)}║\n` : ""}${streakNFTAddress ? `║  StreakNFT:    ${streakNFTAddress.padEnd(46)}║\n` : ""}╚══════════════════════════════════════════════════════════════╝
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});