const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("MutantBatz contract", function () {
  let MutantBatzFactory;
  let MutantBatzContract;
  let mintSigner;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let impersonatedAccount;

  const testData = require('./mutantbatz-test-data.json');
  const testDataByBuyer = testData.reduce(function(rv, x) {
    (rv[x["buyer"]] = rv[x["buyer"]] || []).push(x);
    return rv;
  }, {});

  const testDataBuyerArray = Object.keys(testDataByBuyer).map(buyer => testDataByBuyer[buyer]);

  const victimContracts = [
    "0x57a204AA1042f6E66DD7730813f4024114d74f37", // cyberkongz
    "0x3Fe1a4c1481c8351E91B64D5c398b159dE07cbc5", // supducks
    "0x123b30E25973FeCd8354dd5f41Cc45A3065eF88C", // alien frens
    "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // bayc
    "0x1CB1A5e65610AEFF2551A50f76a87a7d3fB649C6", // cryptoadz
  ]

  let defaultTokenUri = "http://url.com/api/"

  const initialSetup = async () => {
    [ owner, mintSigner, addr1, addr2, ...addrs ] = await ethers.getSigners();
  }

  const deployContract = async () => {
    MutantBatzFactory = await ethers.getContractFactory("MutantBatz");

    MutantBatzContract = await MutantBatzFactory.deploy(
      defaultTokenUri,
      "0xc8adFb4D437357D0A656D4e62fd9a6D22e401aa0"
    );

    await MutantBatzContract.deployed();

    await MutantBatzContract.enableVictim("0x57a204AA1042f6E66DD7730813f4024114d74f37");
    await MutantBatzContract.enableVictim("0x3Fe1a4c1481c8351E91B64D5c398b159dE07cbc5");
    await MutantBatzContract.enableVictim("0x123b30E25973FeCd8354dd5f41Cc45A3065eF88C");
    await MutantBatzContract.enableVictim("0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D");
    await MutantBatzContract.enableVictim("0x1CB1A5e65610AEFF2551A50f76a87a7d3fB649C6");
  }

  const impersonateAccount = async function (account) {
    return hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [account],
    })
    .then(() => {
      return network.provider.send("hardhat_setBalance", [
        account,
        "0x1000000000000000",
      ])
    })
    .then(() => {
      return ethers.getSigner(account)
    })
    .then(account => {
      impersonatedAccount = account;
      return impersonatedAccount;
    })
  }

  const setupSignatures = async function () {
    await MutantBatzContract.connect(owner).setMintSigner(await mintSigner.getAddress());

    domain = {
      name:"MutantBatz",
      version:"1",
      chainId:1337,
      verifyingContract:MutantBatzContract.address
    };
       
    types = {
      bite:[
        {name:"buyer",type:"address"},
        {name:"batId",type:"uint256"},
        {name:"victimContract",type:"address"},
        {name:"victimId",type:"uint256"},
        {name:"tokenURI",type:"string"},
      ],
    };
  }

  const executeBite = async function (data) {
    let signature = await mintSigner._signTypedData(domain, types, data)
    .then(signature => {
      if (impersonatedAccount == null || impersonatedAccount.address != data.buyer) {
        return impersonateAccount(data.buyer)
        .then(() => {
          return signature;
        });
      } else {
        return signature;
      }
    })

    return MutantBatzContract
      .connect(impersonatedAccount)
      .bite(
        data.batId,
        data.victimContract,
        data.victimId,
        data.tokenURI,
        signature
      );
  }

  before(initialSetup);

  describe("Deployment", function () {
    before(deployContract);

    it("Should set the right owner", async function () {
      expect(await MutantBatzContract.owner()).to.equal(owner.address);
    });

    it("Should initially have 0 tokens minted", async function () {
      expect(await MutantBatzContract.totalSupply()).to.equal(0);
    });

    it("Should set the royalties to pay into current contract at 7.5%", async function () {
      let royaltyInfo = await MutantBatzContract.royaltyInfo(1, 100);

      expect(royaltyInfo[0]).to.equal(MutantBatzContract.address);
      expect(royaltyInfo[1]).to.equal(ethers.BigNumber.from("75").div(10));
    });
  });

  describe("Changing settings", function () {
    beforeEach(deployContract);

    it("Should allow contract owner to set default token uri", async function () {
      let url = "http://new.url/api/";

      await MutantBatzContract.connect(owner).setDefaultTokenURI(url);

      expect(await MutantBatzContract.connect(owner).defaultTokenURI()).to.equal(url);
    });

    it("Should fail if others try to set token base uri", async function () {
      let url = "http://new.url/api/";

      await expect(MutantBatzContract.connect(addr1).setDefaultTokenURI(url)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set mint signer", async function () {
      await MutantBatzContract.connect(owner).setMintSigner(addr1.address);

      expect(await MutantBatzContract.mintSigner()).to.equal(addr1.address);
    });

    it("Should not allow any others to set mint signer", async function () {
      expect(MutantBatzContract.connect(addr1).setMintSigner(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to disable victim contracts", async function () {
      await setupSignatures();

      let data = testData.filter(d => d.victimContract == victimContracts[0])[0];

      await executeBite(data);

      expect(await MutantBatzContract.totalSupply()).to.equal(1);

      await MutantBatzContract.connect(owner).disableVictim(victimContracts[0]);

      data = testData.filter(d => d.victimContract == victimContracts[0])[1];

      await expect(executeBite(data)).to.be.revertedWith("This NFT cannot be bitten");
    });

    it("Should not allow any others to disable victim contracts", async function () {
      await expect(MutantBatzContract.connect(addr1).disableVictim(victimContracts[0])).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow disabling already disabled victim contracts", async function () {
      await expect(MutantBatzContract.connect(owner).disableVictim("0x0e9d6552b85be180d941f1ca73ae3e318d2d4f1f")).to.be.revertedWith("Victim not enabled");
    });

    it("Should allow owner to enable victim contracts", async function () {
      await setupSignatures();

      await MutantBatzContract.connect(owner).disableVictim(victimContracts[0]);

      let data = testData.filter(d => d.victimContract == victimContracts[0])[0];

      await expect(executeBite(data)).to.be.revertedWith("This NFT cannot be bitten");

      await MutantBatzContract.connect(owner).enableVictim(victimContracts[0]);

      await executeBite(data);

      await expect(await MutantBatzContract.totalSupply()).to.equal(1);
    });

    it("Should not allow any others to enable victim contracts", async function () {
      await expect(MutantBatzContract.connect(addr1).enableVictim("0x0e9d6552b85be180d941f1ca73ae3e318d2d4f1f")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow enabling already enabled victim contracts or 0 address", async function () {
      await expect(MutantBatzContract.connect(owner).enableVictim(victimContracts[0])).to.be.revertedWith("Victim already enabled");
      await expect(MutantBatzContract.connect(owner).enableVictim(ethers.utils.getAddress(ethers.constants.AddressZero))).to.be.revertedWith("0 address not accepted");
    });
  });

  describe("Biting", function () {
    beforeEach(deployContract);
    beforeEach(setupSignatures);

    it("Should allow owners of a bat and a victim to create a mutant bat", async function () {
      this.timeout(0);

      for (let i = 0; i < 20; i++) {
        let data = testData.splice(Math.floor(Math.random() * testData.length), 1)[0];

        let signature = await mintSigner._signTypedData(domain, types, data);
        if (impersonatedAccount == null || impersonatedAccount.address != data.buyer) {
          await impersonateAccount(data.buyer);
        }
        
        await MutantBatzContract.connect(impersonatedAccount).bite(
          data.batId,
          data.victimContract,
          data.victimId,
          data.tokenURI,
          signature
        );
  
        expect(await MutantBatzContract.totalSupply()).to.equal(i + 1);
        expect(await MutantBatzContract.tokenURI(i + 1)).to.equal(data.tokenURI);
      }
    });

    it("Should fail to allow a bat to be used twice for biting", async function () {
      let accountsWithMultiplePairs = testDataBuyerArray.filter(a => a.length > 1);
      let account = accountsWithMultiplePairs.splice(Math.floor(Math.random() * accountsWithMultiplePairs.length))[0];

      account[1].batId = account[0].batId;

      await executeBite(account[0]);

      await expect(executeBite(account[1])).to.be.revertedWith("CryptoBat has already bitten")
    });

    it("Should fail to allow a victim to be bitten twice", async function () {
      let accountsWithMultiplePairs = testDataBuyerArray.filter(a => a.length > 1);
      let account = accountsWithMultiplePairs.splice(Math.floor(Math.random() * accountsWithMultiplePairs.length), 1)[0];

      account[1].victimContract = account[0].victimContract;
      account[1].victimId = account[0].victimId;

      await executeBite(account[0]);

      await expect(executeBite(account[1])).to.be.revertedWith("This victim has already been bitten")
    });

    it("Should fail to allow using a bat that the sender does not own", async function () {
      let account1 = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let account2 = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account1[0];
      data.batId = account2[0].batId;

      await expect(executeBite(data)).to.be.revertedWith("You're not the owner of this bat")
    });

    it("Should fail to allow using a victim that the sender does not own", async function () {
      let account1 = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let account2 = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account1[0];
      data.victimContract = account2[0].victimContract;
      data.victimId = account2[0].victimId;

      await expect(executeBite(data)).to.be.revertedWith("You're not the owner of this victim")
    });

    it("Should fail to allow victims from an unapproved contract", async function () {
      let account = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account[0];
      data.victimContract = "0x0e9d6552b85be180d941f1ca73ae3e318d2d4f1f";

      await expect(executeBite(data)).to.be.revertedWith("This NFT cannot be bitten")
    });

    it("Should fail if the signature is not signed by the approved signer", async function () {
      let account = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account[0];

      let signature = await addr1._signTypedData(domain, types, data)
      .then(signature => {
        if (impersonatedAccount == null || impersonatedAccount.address != data.buyer) {
          return impersonateAccount(data.buyer)
          .then(() => {
            return signature;
          });
        } else {
          return signature;
        }
      })
  
      await expect(MutantBatzContract
        .connect(impersonatedAccount)
        .bite(
          data.batId,
          data.victimContract,
          data.victimId,
          data.tokenURI,
          signature
        ))
      .to.be.revertedWith("Invalid signature");
    });

    it("Should fail if the signature doesn't match the transaction parameters", async function () {
      let account = testDataBuyerArray.filter(acc => acc.length > 1)[0]
      let data1 = account[0];
      let data2 = account[1];

      let signature = await mintSigner._signTypedData(domain, types, data1)
      .then(signature => {
        if (impersonatedAccount == null || impersonatedAccount.address != data1.buyer) {
          return impersonateAccount(data1.buyer)
          .then(() => {
            return signature;
          });
        } else {
          return signature;
        }
      })
  
      await expect(MutantBatzContract
        .connect(impersonatedAccount)
        .bite(
          data2.batId,
          data2.victimContract,
          data2.victimId,
          data2.tokenURI,
          signature
        ))
      .to.be.revertedWith("Invalid signature");
    });

    it("Should emit a MutantBatCreated event when a tokenURI is supplied", async function () {
      let account = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account[0];

      await expect(executeBite(data)).to.emit(MutantBatzContract, 'MutantBatCreated').withArgs(1, data.batId, data.victimContract, data.victimId);
    });

    it("Should emit a MutantBatIncubating event when a tokenURI is not supplied", async function () {
      let account = testDataBuyerArray.splice(Math.floor(Math.random() * testDataBuyerArray.length), 1)[0]
      let data = account[0];
      data.tokenURI = ""

      await expect(executeBite(data)).to.emit(MutantBatzContract, 'MutantBatIncubating').withArgs(1, data.batId, data.victimContract, data.victimId);
    });

  });

  describe("Withdrawing funds", function () {
    beforeEach(deployContract);

    it("Should allow direct transfers into the contract and withdrawal", async function () {
      expect(await ethers.provider.getBalance(MutantBatzContract.address)).to.equal(0)

      await (await addrs[5].sendTransaction({
        to: MutantBatzContract.address,
        value: ethers.utils.parseEther("10.0")
      })).wait();

      let expectedBalance = ethers.utils.parseEther("10.0");

      expect(await ethers.provider.getBalance(MutantBatzContract.address)).to.equal(expectedBalance)

      let bal1 = await ethers.provider.getBalance("0xaDC6A7985036531c394B6dF054666C51dE29b9a9");
      let bal2 = await ethers.provider.getBalance("0x76bf7b1e22C773754EBC608d92f71cc0B5D99d4B");
      let bal3 = await ethers.provider.getBalance("0xE9E9206B598F6Fc95E006684Fe432f100E876110");

      await expect(await MutantBatzContract.connect(addr2).withdrawAll())
        .to.changeEtherBalances(
          [
            owner,
            MutantBatzContract,
          ],
          [
            0,
            ethers.constants.NegativeOne.mul(expectedBalance)
          ]);

      expect(await ethers.provider.getBalance("0xaDC6A7985036531c394B6dF054666C51dE29b9a9")).to.equal(expectedBalance.mul(70).div(100).add(bal1));
      expect(await ethers.provider.getBalance("0x76bf7b1e22C773754EBC608d92f71cc0B5D99d4B")).to.equal(expectedBalance.mul(25).div(100).add(bal2));
      expect(await ethers.provider.getBalance("0xE9E9206B598F6Fc95E006684Fe432f100E876110")).to.equal(expectedBalance.mul(5).div(100).add(bal3));
    });

    it("Should fail if there is 0 balance in the contract", async function () {
      await expect(MutantBatzContract.connect(owner).withdrawAll()).to.be.revertedWith("No balance to withdraw")
    });
  });
});
