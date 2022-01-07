const { expect } = require("chai");
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

  let auctionPrice;

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
  let publicSaleStepInterval = 300;

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

  const updatePrice = async () => {
    auctionPrice = await CryptoBatzContract.getCurrentAuctionPrice();
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

    it("Should deploy an separate SutterTreasure contract as the royalty recipient address", async function () {
      let royaltyRecipient = await CryptoBatzContract.royaltyRecipient();

      expect(ethers.utils.isAddress(royaltyRecipient)).to.equal(true);
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
      let royaltyRecipient = await CryptoBatzContract.royaltyRecipient();
      let royaltyInfo = await CryptoBatzContract.royaltyInfo(1, 100);

      expect(royaltyInfo[0]).to.equal(royaltyRecipient);
      expect(royaltyInfo[1]).to.equal(ethers.BigNumber.from("75").div(10));

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
    beforeEach(updatePrice);

    it("Should fail to allow whitelist mint before presale starts", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value1);

      await ethers.provider.send('evm_setNextBlockTimestamp', [presaleStartTime - 60]);

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
      expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 3, 3, {value: presaleMintPrice.mul(3)})).to.be.revertedWith("Invalid signature");
    });

    it("Should allow presale minting up to the presale supply limit", async function () {
      this.timeout(0);
      let tempValue1 = { buyer:addrs[0].address, limit:2000 };
      let tempValue2 = { buyer:addrs[1].address, limit:2000 };
      let tempValue3 = { buyer:addrs[2].address, limit:2000 };
      let tempValue4 = { buyer:addrs[3].address, limit:2000 };
      let tempValue5 = { buyer:addrs[4].address, limit:2000 };
      let signature1 = await whitelistSigner._signTypedData(domain, types, tempValue1);
      let signature2 = await whitelistSigner._signTypedData(domain, types, tempValue2);
      let signature3 = await whitelistSigner._signTypedData(domain, types, tempValue3);
      let signature4 = await whitelistSigner._signTypedData(domain, types, tempValue4);
      let signature5 = await whitelistSigner._signTypedData(domain, types, tempValue5);

      for (let i = 0; i < Math.floor(presaleSupplyLimit / 500); i++) {
        await CryptoBatzContract.connect(addrs[0]).buyPresale(signature1, 100, 2000, {value: presaleMintPrice.mul(100)});
        await CryptoBatzContract.connect(addrs[1]).buyPresale(signature2, 100, 2000, {value: presaleMintPrice.mul(100)});
        await CryptoBatzContract.connect(addrs[2]).buyPresale(signature3, 100, 2000, {value: presaleMintPrice.mul(100)});
        await CryptoBatzContract.connect(addrs[3]).buyPresale(signature4, 100, 2000, {value: presaleMintPrice.mul(100)});
        await CryptoBatzContract.connect(addrs[4]).buyPresale(signature5, 100, 2000, {value: presaleMintPrice.mul(100)});
      }

      await CryptoBatzContract.connect(addrs[0]).buyPresale(signature1, (presaleSupplyLimit % 500), 2000, {value: presaleMintPrice.mul((presaleSupplyLimit % 500))});

      await expect(CryptoBatzContract.connect(addrs[1]).buyPresale(signature2, 1, 2000, {value: presaleMintPrice})).to.be.revertedWith('Not enought BATZ remaining');
      await expect(CryptoBatzContract.connect(addrs[2]).buyPresale(signature3, 1, 2000, {value: presaleMintPrice})).to.be.revertedWith('Not enought BATZ remaining');
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(presaleSupplyLimit);
    });

    it(`Should require ${ethers.utils.formatEther(presaleMintPrice)}ETH per token for presale minting`, async function () {
      let sendPrice = presaleMintPrice.sub(1);

      let signature1 = await whitelistSigner._signTypedData(domain, types, value1);
      let signature2 = await whitelistSigner._signTypedData(domain, types, value2);

      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature1, 1, 1, {value: sendPrice})).to.be.revertedWith("Incorrect payment");
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(0);

      await CryptoBatzContract.connect(addr1).buyPresale(signature1, 1, 1, {value: presaleMintPrice});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(1);

      await CryptoBatzContract.connect(addr2).buyPresale(signature2, 3, 3, {value: presaleMintPrice.mul(3)});
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(4);
    });

    it(`Should return ${auctionStartPrice} for getCurrentAuctionPrice before public sale starts`, async function () {
      expect(await CryptoBatzContract.getCurrentAuctionPrice()).to.equal(auctionStartPrice);
    });

    it("Should fail to allow rolling the start index before public sale starts", async function () {
      let provenance = ethers.BigNumber.from(1234);

      await CryptoBatzContract.connect(owner).setProvenance(provenance);

      await expect(CryptoBatzContract.connect(owner).rollStartIndex()).to.be.revertedWith("Too early to roll start index");
    });

    it("Should fail to allow public mint before public sale starts", async function () {
      await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleStartTime - 60]);
      
      await expect(CryptoBatzContract.connect(addr1).buyPublic(1, {value: auctionPrice})).to.be.revertedWith("Sale is not active");
    });

    it("Should allow any wallet to mint during public sale", async function () {
      await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleStartTime]);

      await CryptoBatzContract.connect(addr1).buyPublic(1, {value: auctionPrice});
      await CryptoBatzContract.connect(addr2).buyPublic(2, {value: auctionPrice.mul(2)});
      await CryptoBatzContract.connect(addrs[0]).buyPublic(3, {value: auctionPrice.mul(3)});

      expect(await CryptoBatzContract.balanceOf(addrs[0].address)).to.equal(3);
      expect(await CryptoBatzContract.totalSupply()).to.equal(6);
    });

    it("Should fail to allow presale mint after presale ends", async function () {
      let signature = await whitelistSigner._signTypedData(domain, types, value1);
      
      await expect(CryptoBatzContract.connect(addr1).buyPresale(signature, 1, 1, {value: presaleMintPrice})).to.be.revertedWith("Presale is not active")
    });

    it("Should enforce transaction limit for public sale", async function () {
      await CryptoBatzContract.connect(addr1).buyPublic(1, {value: auctionPrice});
      await CryptoBatzContract.connect(addr1).buyPublic(2, {value: auctionPrice.mul(2)});
      await CryptoBatzContract.connect(addr2).buyPublic(3, {value: auctionPrice.mul(3)});

      expect(await CryptoBatzContract.totalSupply()).to.equal(6);
      await expect(CryptoBatzContract.connect(addr1).buyPublic(4, {value: auctionPrice.mul(4)})).to.be.revertedWith('Transaction limit exceeded');
      await expect(CryptoBatzContract.connect(addr2).buyPublic(10, {value: auctionPrice.mul(10)})).to.be.revertedWith('Transaction limit exceeded');
    });

    it("Should apply dutch auction price rules correctly", async function () {
      let intervals = Math.floor((publicSaleBottomTime - publicSaleStartTime) / publicSaleStepInterval);
      let currentPrice;

      for (let i = 0; i < intervals; i++) {
        currentPrice = await CryptoBatzContract.getCurrentAuctionPrice();
        expect(currentPrice).to.equal(auctionStartPrice.sub(auctionStepPrice.mul(i)));

        await CryptoBatzContract.connect(addr1).buyPublic(1, {value: currentPrice});
        await expect(await CryptoBatzContract.connect(addr1).buyPublic(1, {value: currentPrice.add(auctionStepPrice)}))
          .to.changeEtherBalances(
            [
              addr1,
              CryptoBatzContract
            ],
            [
              ethers.constants.NegativeOne.mul(currentPrice),
              currentPrice
            ]);
        expect(CryptoBatzContract.connect(addr1).buyPublic(1, {value: currentPrice.sub(auctionStepPrice)})).to.be.revertedWith("Insufficient payment")

        await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleStartTime + ((i + 1) * publicSaleStepInterval) - 10]);
        await network.provider.send("evm_mine")
        
        expect(await CryptoBatzContract.getCurrentAuctionPrice()).to.equal(currentPrice);

        await ethers.provider.send('evm_setNextBlockTimestamp', [publicSaleStartTime + ((i + 1) * publicSaleStepInterval)]);
        await network.provider.send("evm_mine")
      }

      currentPrice = await CryptoBatzContract.getCurrentAuctionPrice();
      expect(currentPrice).to.equal(auctionBottomPrice);
      console.log(`${intervals} - ${ethers.utils.formatEther(currentPrice)}`)
    });

    it("Should allow public sale minting up to the max supply limit", async function () {
      this.timeout(0);

      for (let i = 0; i < Math.floor(supplyLimit / 15); i++) {
        await CryptoBatzContract.connect(addr1).buyPublic(3, {value: auctionPrice.mul(3)});
        await CryptoBatzContract.connect(addr2).buyPublic(3, {value: auctionPrice.mul(3)});
        await CryptoBatzContract.connect(addrs[0]).buyPublic(3, {value: auctionPrice.mul(3)});
        await CryptoBatzContract.connect(addrs[1]).buyPublic(3, {value: auctionPrice.mul(3)});
        await CryptoBatzContract.connect(addrs[2]).buyPublic(3, {value: auctionPrice.mul(3)});
      }

      for (let i = 0; i < Math.floor((supplyLimit % 15) / 3); i++) {
        await CryptoBatzContract.connect(addr1).buyPublic(3, {value: auctionPrice.mul(3)});
      }

      await CryptoBatzContract.connect(addr1).buyPublic((supplyLimit % 3), {value: auctionPrice.mul((supplyLimit % 3))});

      await expect(CryptoBatzContract.connect(addr1).buyPublic(1, {value: auctionPrice})).to.be.revertedWith('Not enought BATZ remaining');
      await expect(CryptoBatzContract.connect(addr2).buyPublic(1, {value: auctionPrice})).to.be.revertedWith('Not enought BATZ remaining');
      expect(await CryptoBatzContract.connect(owner).totalSupply()).to.equal(supplyLimit);
    });

    it("Should fail to allow rolling the start index before provenance hash is set", async function () {
      await expect(CryptoBatzContract.connect(owner).rollStartIndex()).to.be.revertedWith("Provenance hash not set");
    });

    it("Should only allow the owner to roll the start index", async function () {
      let provenance = ethers.BigNumber.from(1234);

      await CryptoBatzContract.connect(owner).setProvenance(provenance);

      await expect(CryptoBatzContract.connect(addr1).rollStartIndex()).to.be.revertedWith("Ownable: caller is not the owner");

      await CryptoBatzContract.connect(owner).rollStartIndex();

      let startIndex = (await CryptoBatzContract.randomizedStartIndex()).toNumber();

      expect(startIndex).to.be.greaterThanOrEqual(1);
      expect(startIndex).to.be.lessThanOrEqual(supplyLimit);
    });

    it("Should fail to allow the start index to be rolled more than once", async function () {
      let provenance = ethers.BigNumber.from(1234);

      await CryptoBatzContract.connect(owner).setProvenance(provenance);

      await CryptoBatzContract.connect(owner).rollStartIndex();
      await expect(CryptoBatzContract.connect(owner).rollStartIndex()).to.be.revertedWith("Index already set");
    });

    it("Should fail to allow the provenance hash to be updated once the start index is rolled", async function () {
      let provenance = ethers.BigNumber.from(1234);

      await CryptoBatzContract.connect(owner).setProvenance(provenance);

      await CryptoBatzContract.connect(owner).rollStartIndex();
      
      provenance = ethers.BigNumber.from(5678);

      await expect(CryptoBatzContract.connect(owner).setProvenance(provenance)).to.be.revertedWith("Starting index already set");
    });
  });

  describe("Withdrawing funds", function () {
    beforeEach(deployContract);

    it("Should allow anyone to withdraw the entire balance in the contract into payee addresses", async function () {
      await CryptoBatzContract.connect(addr1).buyPublic(3, {value: auctionBottomPrice.mul(3)});
      await CryptoBatzContract.connect(addr2).buyPublic(3, {value: auctionBottomPrice.mul(3)});

      let expectedBalance = auctionBottomPrice.mul(6);

      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(expectedBalance)

      await expect(await CryptoBatzContract.connect(addrs[4]).withdrawAll())
        .to.changeEtherBalances(
          [
            owner,
            CryptoBatzContract
          ],
          [
            0,
            ethers.constants.NegativeOne.mul(expectedBalance)
          ]);

      expect(await ethers.provider.getBalance("0xFa65B0e06BB42839aB0c37A26De4eE0c03B30211")).to.equal(expectedBalance.mul(50).div(100));
      expect(await ethers.provider.getBalance("0x09e339CEF02482f4C4127CC49C153303ad801EE0")).to.equal(expectedBalance.mul(45).div(100));
      expect(await ethers.provider.getBalance("0xE9E9206B598F6Fc95E006684Fe432f100E876110")).to.equal(expectedBalance.mul(5).div(100));
    });

    it("Should allow direct transfers into the contract and withdrawal", async function () {
      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(0)

      await (await addrs[5].sendTransaction({
        to: CryptoBatzContract.address,
        value: ethers.utils.parseEther("10.0")
      })).wait();

      let expectedBalance = ethers.utils.parseEther("10.0");

      expect(await ethers.provider.getBalance(CryptoBatzContract.address)).to.equal(expectedBalance)

      let bal1 = await ethers.provider.getBalance("0xFa65B0e06BB42839aB0c37A26De4eE0c03B30211");
      let bal2 = await ethers.provider.getBalance("0x09e339CEF02482f4C4127CC49C153303ad801EE0");
      let bal3 = await ethers.provider.getBalance("0xE9E9206B598F6Fc95E006684Fe432f100E876110");

      await expect(await CryptoBatzContract.connect(addr2).withdrawAll())
        .to.changeEtherBalances(
          [
            owner,
            CryptoBatzContract,
          ],
          [
            0,
            ethers.constants.NegativeOne.mul(expectedBalance)
          ]);

      expect(await ethers.provider.getBalance("0xFa65B0e06BB42839aB0c37A26De4eE0c03B30211")).to.equal(expectedBalance.mul(50).div(100).add(bal1));
      expect(await ethers.provider.getBalance("0x09e339CEF02482f4C4127CC49C153303ad801EE0")).to.equal(expectedBalance.mul(45).div(100).add(bal2));
      expect(await ethers.provider.getBalance("0xE9E9206B598F6Fc95E006684Fe432f100E876110")).to.equal(expectedBalance.mul(5).div(100).add(bal3));
    });

    it("Should fail if there is 0 balance in the contract", async function () {
      await expect(CryptoBatzContract.connect(owner).withdrawAll()).to.be.revertedWith("No balance to withdraw")
    });
  });

  describe("Query Wallet Content", function () {
    beforeEach(deployContract);

    it("Should return empty for wallets that does not own any NFTs", async function () {
      var walletContents = await CryptoBatzContract.connect(owner).tokensOwnedBy(addr1.address);

      expect(walletContents).to.be.an('array').that.is.empty;
    });

    it("Should return an array of token ids of the tokens owned by a wallet", async function () {
      await CryptoBatzContract.connect(addr1).buyPublic(3, {value: auctionPrice.mul(3)});
      await CryptoBatzContract.connect(addr2).buyPublic(2, {value: auctionPrice.mul(2)});
      await CryptoBatzContract.connect(addr1).buyPublic(1, {value: auctionPrice.mul(1)});

      var wallet1Contents = await CryptoBatzContract.connect(owner).tokensOwnedBy(addr1.address);
      expect(wallet1Contents).to.be.an('array').that.is.not.empty;
      expect(wallet1Contents.length).to.equal(4);
      expect(wallet1Contents[0]).to.equal(1);
      expect(wallet1Contents[1]).to.equal(2);
      expect(wallet1Contents[2]).to.equal(3);
      expect(wallet1Contents[3]).to.equal(6);

      var wallet2Contents = await CryptoBatzContract.connect(owner).tokensOwnedBy(addr2.address);
      expect(wallet2Contents).to.be.an('array').that.is.not.empty;
      expect(wallet2Contents.length).to.equal(2);
      expect(wallet2Contents[0]).to.equal(4);
      expect(wallet2Contents[1]).to.equal(5);
    });
  });
});
