import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Deploying DailyDrop on ${network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH/CELO\n`);

  const DailyDrop = await ethers.getContractFactory("DailyDrop");
  const dailydrop = await DailyDrop.deploy();
  await dailydrop.waitForDeployment();

  const address = await dailydrop.getAddress();
  console.log(`✅ DailyDrop deployed at: ${address}`);

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  let deployments: Record<string, string> = {};

  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }

  deployments[network.name] = address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`📝 Saved to deployments.json`);

  // Update frontend .env
  const envKey = network.name === "celo"
    ? "NEXT_PUBLIC_CELO_CONTRACT_ADDRESS"
    : "NEXT_PUBLIC_BASE_CONTRACT_ADDRESS";

  const envPath = path.join(__dirname, "../frontend/.env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  if (envContent.includes(envKey)) {
    envContent = envContent.replace(new RegExp(`${envKey}=.*`), `${envKey}=${address}`);
  } else {
    envContent += `\n${envKey}=${address}`;
  }

  fs.writeFileSync(envPath, envContent.trim());
  console.log(`🔧 Updated frontend/.env.local with ${envKey}`);
  console.log(`\n🎉 Done! Contract: ${address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
