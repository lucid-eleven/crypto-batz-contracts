const { expect, assert } = require("chai");
const { formatEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("CryptoBatz contract", function () {
  let CryptoBatzFactory;
  let CryptoBatzContract;
  let whitelistSigner;
  let ancientBatzMinter;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  var presaleMintPrice = ethers.utils.parseEther("0.088");
  var auctionStartPrice = ethers.utils.parseEther("0.666");
  var auctionBottomPrice = ethers.utils.parseEther("0.1");
  var auctionStepPrice = ethers.utils.parseEther("0.0157");
  var presaleSupplyLimit = 7166;
  var supplyLimit = 9666;
  let baseUri = "http://url.com/api/"
  let presaleStartTime = (+new Date("Wed Jan 19 2022 23:00:00 GMT+0000"))/1000;
  let presaleEndTime = (+new Date("Thu Jan 20 2022 23:00:00 GMT+0000"))/1000;
  let publicSaleStartTime = (+new Date("Thu Jan 20 2022 23:00:00 GMT+0000"))/1000;
  let publicSaleBottomTime = (+new Date("Fri Jan 21 2022 02:00:00 GMT+0000"))/1000;

  const initialSetup = async () => {
    [ owner, whitelistSigner, ancientBatzMinter, addr1, addr2, ...addrs ] = await ethers.getSigners();
  }

  const deployContract = async () => {
    CryptoBatzFactory = await ethers.getContractFactory("CryptoBatz");

    CryptoBatzContract = await CryptoBatzFactory.deploy(
      baseUri,
    );

    await CryptoBatzContract.deployed();
  }

  const setupWhitelistData = async function () {
    await CryptoBatzContract.connect(owner).setWhitelistSigner(await whitelistSigner.getAddress());

    domain = {
      name:"CryptoBatz",
      version:"1",
      chainId:1337,
      verifyingContract:CryptoBatzContract.address
    };
       
    types = {
      presale:[
        {name:"buyer",type:"address"},
        {name:"limit",type:"uint256"}
      ],
    };

    let buyerAddr1 = ethers.utils.getAddress(addr1.address);
    let buyerAddr2 = ethers.utils.getAddress(addr2.address);

    value1 = {
      buyer:buyerAddr1,
      limit:1
    };

    value2 = {
      buyer:buyerAddr2,
      limit:3
    };
  }

  before(initialSetup);

  describe("Deployment", function () {
    before(deployContract);

    it("Should set the right owner", async function () {
      expect(await CryptoBatzContract.owner()).to.equal(owner.address);
    });

    it("Should set the right sale config", async function () {
      let presaleConfig = await CryptoBatzContract.presaleConfig();

      expect(presaleConfig.startTime).to.equal(presaleStartTime);
      expect(presaleConfig.endTime).to.equal(presaleEndTime);
      expect(presaleConfig.supplyLimit).to.equal(presaleSupplyLimit);
      expect(presaleConfig.mintPrice).to.equal(presaleMintPrice);

      let dutchAuctionConfig = await CryptoBatzContract.dutchAuctionConfig();

      expect(dutchAuctionConfig.txLimit).to.equal(3);
      expect(dutchAuctionConfig.supplyLimit).to.equal(9666);
      expect(dutchAuctionConfig.startTime).to.equal(publicSaleStartTime);
      expect(dutchAuctionConfig.bottomTime).to.equal(publicSaleBottomTime);
      expect(dutchAuctionConfig.stepInterval).to.equal(300);
      expect(dutchAuctionConfig.startPrice).to.equal(auctionStartPrice);
      expect(dutchAuctionConfig.bottomPrice).to.equal(auctionBottomPrice);
      expect(dutchAuctionConfig.priceStep).to.equal(auctionStepPrice);
    });

    it("Should set the ancientbatz minter as the contract deployer", async function () {
      expect(await CryptoBatzContract.ancientBatzMinter()).to.equal(owner.address);
    });

    it("Should initially have 0 tokens minted", async function () {
      expect(await CryptoBatzContract.totalSupply()).to.equal(0);
    });
  });

  describe("Changing settings", function () {
    beforeEach(deployContract);

    it("Should allow contract owner to set token base uri", async function () {
      let url = "http://new.url/api/";

      await CryptoBatzContract.connect(owner).setBaseURI(url);

      expect(await CryptoBatzContract.connect(owner).baseURI()).to.equal(url);
    });

    it("Should fail if others try to set token base uri", async function () {
      let url = "http://new.url/api/";

      await expect(CryptoBatzContract.connect(addr1).setBaseURI(url)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set whitelist signer", async function () {
      await CryptoBatzContract.connect(owner).setWhitelistSigner(addr1.address);

      expect(await CryptoBatzContract.whitelistSigner()).to.equal(addr1.address);
    });

    it("Should not allow any others to set whitelist signer", async function () {
      expect(CryptoBatzContract.connect(addr1).setWhitelistSigner(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set ancientBatzMinter", async function () {
      await CryptoBatzContract.connect(owner).setAncientBatzMinter(addr1.address);

      expect(await CryptoBatzContract.ancientBatzMinter()).to.equal(addr1.address);
    });

    it("Should not allow any others to set ancientBatzMinter", async function () {
      expect(CryptoBatzContract.connect(addr1).setAncientBatzMinter(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set the provenance hash", async function () {
      let hash = ethers.utils.keccak256(ethers.BigNumber.from(1234));

      await CryptoBatzContract.connect(owner).setProvenance(hash);

      expect(await CryptoBatzContract.PROVENANCE_HASH()).to.equal(hash);
    });

    it("Should not allow any others to set the provenance hash", async function () {
      let hash = ethers.utils.keccak256(ethers.BigNumber.from(1234));
      expect(CryptoBatzContract.connect(addr1).setProvenance(hash)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to change the sale config", async function () {
      let newPresaleStartTime = (+new Date("4 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPresaleEndTime = (+new Date("5 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPresaleSupplyLimit = 9000;
      let newPresaleMintPrice = ethers.utils.parseEther("0.2");

      await CryptoBatzContract.connect(owner).configurePresale(
        newPresaleStartTime,
        newPresaleEndTime,
        newPresaleSupplyLimit,
        newPresaleMintPrice,
      );

      let presaleConfig = await CryptoBatzContract.presaleConfig();

      expect(presaleConfig.startTime).to.equal(newPresaleStartTime);
      expect(presaleConfig.endTime).to.equal(newPresaleEndTime);
      expect(presaleConfig.supplyLimit).to.equal(newPresaleSupplyLimit);
      expect(presaleConfig.mintPrice).to.equal(newPresaleMintPrice);

      let newPublicSaleTxLimit = 5;
      let newPublicSaleSupplyLimit = 10100;
      let newPublicSaleStartTime = (+new Date("5 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPublicSaleBottomTime = (+new Date("6 Feb 2022 04:00:00 UTC+0800"))/1000;
      let newPublicSaleStepInterval = 600;
      let newPublicSaleStartPrice = ethers.utils.parseEther("1");
      let newPublicSaleBottomPrice = ethers.utils.parseEther("0.2");
      let newPublicSalePriceStep = ethers.utils.parseEther("0.02");

      await CryptoBatzContract.connect(owner).configureDutchAuction(
        newPublicSaleTxLimit,
        newPublicSaleSupplyLimit,
        newPublicSaleStartTime,
        newPublicSaleBottomTime,
        newPublicSaleStepInterval,
        newPublicSaleStartPrice,
        newPublicSaleBottomPrice,
        newPublicSalePriceStep,
      );

      let dutchAuctionConfig = await CryptoBatzContract.dutchAuctionConfig();

      expect(dutchAuctionConfig.txLimit).to.equal(newPublicSaleTxLimit);
      expect(dutchAuctionConfig.supplyLimit).to.equal(newPublicSaleSupplyLimit);
      expect(dutchAuctionConfig.startTime).to.equal(newPublicSaleStartTime);
      expect(dutchAuctionConfig.bottomTime).to.equal(newPublicSaleBottomTime);
      expect(dutchAuctionConfig.stepInterval).to.equal(newPublicSaleStepInterval);
      expect(dutchAuctionConfig.startPrice).to.equal(newPublicSaleStartPrice);
      expect(dutchAuctionConfig.bottomPrice).to.equal(newPublicSaleBottomPrice);
      expect(dutchAuctionConfig.priceStep).to.equal(newPublicSalePriceStep);
    });

    it("Should not allow any others to change the sale config", async function () {
      let newPresaleStartTime = (+new Date("4 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPresaleEndTime = (+new Date("5 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPresaleSupplyLimit = 9000;
      let newPresaleMintPrice = ethers.utils.parseEther("0.2");

      expect(CryptoBatzContract.connect(addr1).configurePresale(
        newPresaleStartTime,
        newPresaleEndTime,
        newPresaleSupplyLimit,
        newPresaleMintPrice,
      )).to.be.revertedWith("Ownable: caller is not the owner");

      let newPublicSaleTxLimit = 5;
      let newPublicSaleSupplyLimit = 10100;
      let newPublicSaleStartTime = (+new Date("5 Feb 2022 22:00:00 UTC+0800"))/1000;
      let newPublicSaleBottomTime = (+new Date("6 Feb 2022 04:00:00 UTC+0800"))/1000;
      let newPublicSaleStepInterval = 600;
      let newPublicSaleStartPrice = ethers.utils.parseEther("1");
      let newPublicSaleBottomPrice = ethers.utils.parseEther("0.2");
      let newPublicSalePriceStep = ethers.utils.parseEther("0.02");

      expect(CryptoBatzContract.connect(addr1).configureDutchAuction(
        newPublicSaleTxLimit,
        newPublicSaleSupplyLimit,
        newPublicSaleStartTime,
        newPublicSaleBottomTime,
        newPublicSaleStepInterval,
        newPublicSaleStartPrice,
        newPublicSaleBottomPrice,
        newPublicSalePriceStep,
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to change the royalties", async function () {
      let royaltyInfo = await CryptoBatzContract.royaltyInfo(1, 100);

      expect(royaltyInfo[0]).to.equal(CryptoBatzContract.address);
      expect(royaltyInfo[1]).to.equal(ethers.BigNumber.from("5"));

      await CryptoBatzContract.connect(owner).setRoyalties(addr1.address, 1000);

      royaltyInfo = await CryptoBatzContract.royaltyInfo(1, 100);
      expect(royaltyInfo[0]).to.equal(addr1.address);
      expect(royaltyInfo[1]).to.equal(ethers.BigNumber.from("10"));
    });

    it("Should not allow any others to change the royalties", async function () {
      expect(CryptoBatzContract.connect(addr1).setRoyalties(addr1.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Reserving tokens", function () {
    beforeEach(deployContract);

    it("Should allow the owner to reserve tokens without payment", async function () {
      await CryptoBatzContract.connect(owner).reserve(owner.address, 1);
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(1);
    });

    it("Should not allow anyone else to reserve tokens", async function () {
      await expect(CryptoBatzContract.connect(addr1).reserve(addr1.address, 1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should be able to reserve 50 tokens at a time", async function () {
      await CryptoBatzContract.connect(owner).reserve(owner.address, 50);
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(50);
    });

    it("Should allow reserving multiple batches of tokens", async function () {
      await CryptoBatzContract.connect(owner).reserve(owner.address, 20);
      await CryptoBatzContract.connect(owner).reserve(owner.address, 50);
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(70);
    });

    it("Should allow reserving directly to any wallet", async function () {
      await CryptoBatzContract.connect(owner).reserve(addr1.address, 15);
      await CryptoBatzContract.connect(owner).reserve(addr2.address, 20);

      expect(await CryptoBatzContract.balanceOf(addr1.address)).to.equal(15);
      expect(await CryptoBatzContract.balanceOf(addr2.address)).to.equal(20);
      expect(await CryptoBatzContract.totalSupply()).to.equal(35);
    });

    it("Should not allow reserving tokens beyond the MAX_OWNER_RESERVE", async function () {
      for (let i = 0; i < 10; i++) {
        await CryptoBatzContract.connect(owner).reserve(owner.address, 10);
      }
      await CryptoBatzContract.connect(owner).reserve(owner.address, 1);

      await expect(CryptoBatzContract.connect(owner).reserve(owner.address, 1)).to.be.revertedWith("Exceeds owner reserve limit");
    });
  });

  describe("Sale progression", function () {
    beforeEach(deployContract);
    beforeEach(setupWhitelistData);

    it("Should fail to allow whitelist mint before presale starts", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value1);

      await ethers.provider.send('evm_setNextBlockTimestamp', [presaleStartTime - 1000]);

      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 1, {value: presaleMintPrice})).to.be.revertedWith("Presale is not active");
    });

    it("Should allow whitelisted wallet to mint during presale", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value1);
      
      await ethers.provider.send('evm_setNextBlockTimestamp', [presaleStartTime]);

      await CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 1, {value: presaleMintPrice});

      expect(await CryptoBatzContract.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should fail to allow minting more than approved limit", async function () {
      let signature1 = await whitelistSigner._signTypedData(domain, types, value1);
      let signature2 = await whitelistSigner._signTypedData(domain, types, value2);

      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature1, 2, 1, {value: presaleMintPrice.mul(2)})).to.be.revertedWith("Mint limit exceeded");
      await CryptoBatzContract.connect(addr2).buyPresale(signature2, 2, 3, {value: presaleMintPrice.mul(2)});
      await expect(CryptoBatzContract.connect(addr2).buyPresale(signature2, 2, 3, {value: presaleMintPrice.mul(2)})).to.be.revertedWith("Mint limit exceeded");
    });

    it("Should fail if presale signature produced by someone other than specified signer", async function () {
      let signature = await addr2._signTypedData(domain, types, value1);

      expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 1, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
      expect(CryptoBatzContract.connect(addr2).buyPresale(signature, 1, 1, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if presale signature was meant for a different wallet address", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value2);

      expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 3, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
      expect(CryptoBatzContract.connect(addrs[2]).buyPresale(signature, 1, 3, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if presale approved limit has been tampered with", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value1);

      expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 2, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
      expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 3, 3, {value: presaleMintPrice})).to.be.revertedWith("Invalid signature");
    });

    it("Should allow presale minting up to the max supply limit", async function () {
      this.timeout(0);
      let signature = await whitelistSigner._signTypedData(domain, types, value1);
      let signature2 = await whitelistSigner._signTypedData(domain, types, value2);

      for (let i = 0; i < 194; i++) {
        await CryptoBatzContract.connect(addr1).buyPresale(signature, 20, {value: presaleMintPrice.mul(20)});
        await CryptoBatzContract.connect(addr2).buyPresale(signature2, 20, {value: presaleMintPrice.mul(20)});
      }

      await CryptoBatzContract.connect(addr1).buyPresale(signature, 17, {value: presaleMintPrice.mul(17)});

      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, {value: presaleMintPrice})).to.be.revertedWith('Not enough tokens left');
      await expect(CryptoBatzContract.connect(addr2).buyPresale(signature2, 1, {value: presaleMintPrice})).to.be.revertedWith('Not enough tokens left');
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(7777);
    });

    it("Should require 0.04ETH per token for presale minting", async function () {
      let sendPrice = presaleMintPrice.sub(1);

      let signature1 = await whitelistSigner._signTypedData(domain, types, value1);
      let signature2 = await whitelistSigner._signTypedData(domain, types, value2);

      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature1, 1, {value: sendPrice})).to.be.revertedWith("Incorrect payment");
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(0);

      await CryptoBatzContract.connect(addr2).buyPresale(signature2, 1, {value: presaleMintPrice});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(1);

      await CryptoBatzContract.connect(addr1).buyPresale(signature1, 3, {value: presaleMintPrice.mul(3)});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(4);
    });

    it("Should fail to allow public mint before public sale starts", async function () {
      await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleTimestamp - 1000]);

      await expect(CryptoBatzContract.connect(addr1).buy(1, {value: presaleMintPrice})).to.be.revertedWith("Sale is not active");
    });

    it("Should allow any wallet to mint during public sale", async function () {
      await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleTimestamp]);

      await CryptoBatzContract.connect(addr1).buy(1, {value: presaleMintPrice});
      await CryptoBatzContract.connect(addr2).buy(2, {value: presaleMintPrice.mul(2)});
      await CryptoBatzContract.connect(addrs[0]).buy(3, {value: presaleMintPrice.mul(3)});
      await CryptoBatzContract.connect(addrs[4]).buy(4, {value: presaleMintPrice.mul(4)});

      expect(await CryptoBatzContract.balanceOf(addrs[0].address)).to.equal(3);
      expect(await CryptoBatzContract.totalSupply()).to.equal(10);
    });

    it("Should enforce transaction limit for public sale", async function () {
      await CryptoBatzContract.connect(addr1).buy(1, {value: presaleMintPrice});
      await CryptoBatzContract.connect(addr1).buy(14, {value: presaleMintPrice.mul(14)});
      await CryptoBatzContract.connect(addr2).buy(20, {value: presaleMintPrice.mul(20)});

      expect(await CryptoBatzContract.totalSupply()).to.equal(35);
      await expect(CryptoBatzContract.connect(addr1).buy(21, {value: presaleMintPrice.mul(21)})).to.be.revertedWith('Transaction limit exceeded');
      await expect(CryptoBatzContract.connect(addr2).buy(30, {value: presaleMintPrice.mul(30)})).to.be.revertedWith('Transaction limit exceeded');
    });

    it("Should allow public sale minting up to the max supply limit", async function () {
      this.timeout(0);

      for (let i = 0; i < 77; i++) {
        await CryptoBatzContract.connect(addr1).buy(20, {value: presaleMintPrice.mul(20)});
        await CryptoBatzContract.connect(addr2).buy(20, {value: presaleMintPrice.mul(20)});
        await CryptoBatzContract.connect(addrs[0]).buy(20, {value: presaleMintPrice.mul(20)});
        await CryptoBatzContract.connect(addrs[1]).buy(20, {value: presaleMintPrice.mul(20)});
        await CryptoBatzContract.connect(addrs[2]).buy(20, {value: presaleMintPrice.mul(20)});
      }

      await CryptoBatzContract.connect(addr1).buy(20, {value: presaleMintPrice.mul(20)});
      await CryptoBatzContract.connect(addr2).buy(20, {value: presaleMintPrice.mul(20)});
      await CryptoBatzContract.connect(addrs[0]).buy(20, {value: presaleMintPrice.mul(20)});
      await CryptoBatzContract.connect(addrs[1]).buy(17, {value: presaleMintPrice.mul(17)});

      await expect(CryptoBatzContract.connect(addr1).buy(1, {value: presaleMintPrice})).to.be.revertedWith('Not enough tokens left');
      await expect(CryptoBatzContract.connect(addr2).buy(1, {value: presaleMintPrice})).to.be.revertedWith('Not enough tokens left');
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(7777);
    });

    it("Should require 0.04ETH per token for public sale minting", async function () {
      let sendPrice = presaleMintPrice.sub(1);

      await expect(CryptoBatzContract.connect(addr1).buy(1, {value: sendPrice})).to.be.revertedWith("Incorrect payment");
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(0);

      await CryptoBatzContract.connect(addr2).buy(1, {value: presaleMintPrice});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(1);

      await CryptoBatzContract.connect(addr1).buy(3, {value: presaleMintPrice.mul(3)});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(4);
    });
  });

  describe("Withdrawing funds", function () {
    beforeEach(deployContract);

    it("Should allow the contract owner to withdraw the entire balance in the contract", async function () {
      await CryptoBatzContract.connect(addr1).buy(5, {value: presaleMintPrice.mul(5)});
      await CryptoBatzContract.connect(addr2).buy(5, {value: presaleMintPrice.mul(5)});

      let expectedBalance = presaleMintPrice.mul(10);

      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(expectedBalance)

      await expect(await CryptoBatzContract.connect(owner).withdraw())
        .to.changeEtherBalances(
          [
            owner,
            CryptoBatzContract
          ],
          [
            0,
            ethers.constants.NegativeOne.mul(expectedBalance)
          ]);

      expect(await ethers.provider.getBalance("0x9E5fec6141578296d33cF64912f666F49913Ee26")).to.equal(expectedBalance.mul(315).div(1000));
      expect(await ethers.provider.getBalance("0x95f62b23F8B426E750372632c8F034dC89cBaE68")).to.equal(expectedBalance.mul(315).div(1000));
      expect(await ethers.provider.getBalance("0xe05AdCB63a66E6e590961133694A382936C85d9d")).to.equal(expectedBalance.mul(100).div(1000));
      expect(await ethers.provider.getBalance("0xdeF4274dA60CEF85402731F0013E5C67fC3D5c2e")).to.equal(expectedBalance.mul(20).div(1000));
      expect(await ethers.provider.getBalance("0x69F5CEc1DDC1fFC5Fa03e32FFE415bB92fB9ac67")).to.equal(expectedBalance.mul(50).div(1000));
      expect(await ethers.provider.getBalance("0x535E9E9E73b621b9aC4EE05550bfda96CB87E48f")).to.equal(expectedBalance.mul(200).div(1000));
    });

    it("Should allow direct transfers into the contract and withdrawal", async function () {
      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(0)

      await (await addrs[5].sendTransaction({
        to: CryptoBatzContract.address,
        value: ethers.utils.parseEther("10.0")
      })).wait();

      let expectedBalance = ethers.utils.parseEther("10.0");

      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(expectedBalance)

      let bal1 = await ethers.provider.getBalance("0x9E5fec6141578296d33cF64912f666F49913Ee26");
      let bal2 = await ethers.provider.getBalance("0x95f62b23F8B426E750372632c8F034dC89cBaE68");
      let bal3 = await ethers.provider.getBalance("0xe05AdCB63a66E6e590961133694A382936C85d9d");
      let bal4 = await ethers.provider.getBalance("0xdeF4274dA60CEF85402731F0013E5C67fC3D5c2e");
      let bal5 = await ethers.provider.getBalance("0x69F5CEc1DDC1fFC5Fa03e32FFE415bB92fB9ac67");
      let bal6 = await ethers.provider.getBalance("0x535E9E9E73b621b9aC4EE05550bfda96CB87E48f");

      await expect(await CryptoBatzContract.connect(owner).withdraw())
        .to.changeEtherBalances(
          [
            owner,
            CryptoBatzContract,
          ],
          [
            0,
            ethers.constants.NegativeOne.mul(expectedBalance)
          ]);

      expect(await ethers.provider.getBalance("0x9E5fec6141578296d33cF64912f666F49913Ee26")).to.equal(expectedBalance.mul(315).div(1000).add(bal1));
      expect(await ethers.provider.getBalance("0x95f62b23F8B426E750372632c8F034dC89cBaE68")).to.equal(expectedBalance.mul(315).div(1000).add(bal2));
      expect(await ethers.provider.getBalance("0xe05AdCB63a66E6e590961133694A382936C85d9d")).to.equal(expectedBalance.mul(100).div(1000).add(bal3));
      expect(await ethers.provider.getBalance("0xdeF4274dA60CEF85402731F0013E5C67fC3D5c2e")).to.equal(expectedBalance.mul(20).div(1000).add(bal4));
      expect(await ethers.provider.getBalance("0x69F5CEc1DDC1fFC5Fa03e32FFE415bB92fB9ac67")).to.equal(expectedBalance.mul(50).div(1000).add(bal5));
      expect(await ethers.provider.getBalance("0x535E9E9E73b621b9aC4EE05550bfda96CB87E48f")).to.equal(expectedBalance.mul(200).div(1000).add(bal6));
    });

    it("Should fail if there is 0 balance in the contract", async function () {
      await expect(CryptoBatzContract.connect(owner).withdraw()).to.be.revertedWith("No balance to withdraw")
    });

    it("Should fail if anyone other than the owner tries to withdraw", async function () {
      await expect(CryptoBatzContract.connect(addr1).withdraw()).to.be.revertedWith("Ownable: caller is not the owner")
      await expect(CryptoBatzContract.connect(addr2).withdraw()).to.be.revertedWith("Ownable: caller is not the owner")
    });
  });
});
