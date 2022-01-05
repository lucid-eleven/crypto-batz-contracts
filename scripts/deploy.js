const { network } = require("hardhat");

// yours, or create new ones.
async function main() {
    // This is just a convenience check
    if (network.name === "hardhat") {
      console.warn(
        "You are trying to deploy a contract to the Hardhat Network, which" +
          "gets automatically created and destroyed every time. Use the Hardhat" +
          " option '--network localhost'"
      );
    }
  
    // ethers is available in the global scope
    const [deployer] = await ethers.getSigners();
    console.log(
      "Deploying the contracts with the account:",
      await deployer.getAddress()
    );
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const CryptoBatzContract = await (await (await ethers.getContractFactory("CryptoBatz")).deploy(
      "ipfs://hash/",
    )).deployed();

    console.log("CryptoBatz contract address:", CryptoBatzContract.address);
    
    // We also save the contract's artifacts and address in the frontend directory
    saveFrontendFiles(CryptoBatzContract);
  }
  
  function saveFrontendFiles(CryptoBatzContract) {
    const fs = require("fs");
    const outputDir = __dirname + "/../deploy";
  
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  
    var contractAddressesJson = fs.readFileSync(
      outputDir + "/contract-address.json",
      { flag: "a+" }
    );

    contractAddresses = contractAddressesJson.length == 0 ? {} : JSON.parse(contractAddressesJson);

    contractAddresses[network.name].CryptoBatz = CryptoBatzContract.address;
    
    fs.writeFileSync(
      outputDir + "/contract-address.json",
      JSON.stringify(contractAddresses, undefined, 2)
    );
  
    const CryptoBatzArtifact = artifacts.readArtifactSync("CryptoBatz");
  
    fs.writeFileSync(
      outputDir + "/CryptoBatz.json",
      JSON.stringify(CryptoBatzArtifact, null, 2)
    );

    fs.writeFileSync(
      deployDir + "/CryptoBatzABI.json",
      JSON.stringify(CryptoBatzArtifact.abi, null, 2)
    );

    fs.writeFileSync(
      deployDir + "/CryptoBatzByteCode.txt",
      CryptoBatzArtifact.bytecode
    );
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  