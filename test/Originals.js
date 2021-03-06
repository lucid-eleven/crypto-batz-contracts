const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("Originals contract", function () {
  let CryptoBatzFactory;
  let CryptoBatzContract;
  let OriginalsFactory;
  let OriginalsContract;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const initialSetup = async function () {
    this.timeout(0);

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    CryptoBatzFactory = await ethers.getContractFactory("MockERC721");
    CryptoBatzContract = await CryptoBatzFactory.deploy();
    await CryptoBatzContract.deployed();

    for (let i = 0; i < 10; i++) {
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
      await CryptoBatzContract.connect(addrs[i]).mint(100);
    }
  }

  const deployContract = async () => {
    OriginalsFactory = await ethers.getContractFactory("Originals");

    OriginalsContract = await OriginalsFactory.deploy(
      CryptoBatzContract.address
    );

    await OriginalsContract.deployed();
  }

  before(initialSetup);

  describe("Deployment", function () {
    before(deployContract);

    it("Should set the right owner", async function () {
      expect(await OriginalsContract.owner()).to.equal(owner.address);
    });

    it("Should initially have 0 tokens minted", async function () {
      expect(await OriginalsContract.totalSupply()).to.equal(0);
    });

    it("Should initially have the randomised seed = 0", async function () {
      expect(await OriginalsContract.randomizedSeed()).to.equal(0);
    });

    it("Should initially have mintActive = false", async function () {
      expect(await OriginalsContract.mintActive()).to.be.false;
    });

    it("Should set the royalties to pay into current contract at 7.5%", async function () {
      let royaltyInfo = await OriginalsContract.royaltyInfo(1, 100);

      expect(royaltyInfo[0]).to.equal("0x86Ca2299e82765fC6057Da161De655CE5575d7BC");
      expect(royaltyInfo[1]).to.equal(ethers.BigNumber.from("75").div(10));
    });
  });

  describe("Minting", function () {
    beforeEach(deployContract);
    beforeEach(async function () {
      await OriginalsContract.connect(owner).toggleMintActive();
    })

    it("Should allow owners of bats to mint Originals", async function () {
      for (let i = 0; i < 10; i++) {
        await OriginalsContract.connect(addrs[i]).mint(
          Array.from(Array((i + 1) * 10).keys()).map(x => x + 1 + (i * 1000))
        );

        expect(await OriginalsContract.balanceOf(addrs[i].address)).to.equal((i + 1) * 10);
      }
    });

    it("Should fail to allow a bat to be used twice for minting an Original", async function () {
      await OriginalsContract.connect(addrs[1]).mint([1001, 1005, 1010]);

      await expect(OriginalsContract.connect(addrs[1]).mint([1005])).to.be.revertedWith("BatAlreadyClaimed()")
    });

    it("Should fail to allow using a bat that the sender does not own", async function () {
      await expect(OriginalsContract.connect(addrs[1]).mint([1001, 1005, 1010, 2001])).to.be.revertedWith("NotTheBatOwner(2001)")
    });

    it("Should allow contract owner to deactivate the mint", async function () {
      await OriginalsContract.connect(addrs[1]).mint([1001]);

      await OriginalsContract.connect(owner).toggleMintActive();

      await expect(OriginalsContract.connect(addrs[1]).mint([1005])).to.be.revertedWith("MintNotActive()")
    });

    it("Should not allow anyone else to deactivate the mint", async function () {
      await expect(OriginalsContract.connect(addr2).toggleMintActive()).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Distribution", function () {
    beforeEach(deployContract);
    beforeEach(async function () {
      await OriginalsContract.connect(owner).toggleMintActive();
    })

    it("Should return the default token URI if the randomized seed is not set", async function () {
      await OriginalsContract.connect(addrs[2]).mint(
        Array.from(Array(10).keys()).map(x => x + 2001)
      );

      for (let i = 1; i < 11; i++) {
        expect(await OriginalsContract.tokenURI(i)).to.equal("ipfs://QmNVxVPgnC5axSzgfiHgQycxwt9f3jSTJz3wKXFxiJgB7P")
      }
    });

    it("Should allow the owner to set the randomised seed", async function () {
      expect(await OriginalsContract.randomizedSeed()).to.equal(0)

      await OriginalsContract.connect(owner).setRandomizedSeed();

      expect(await OriginalsContract.randomizedSeed()).not.to.equal(0)
    });

    it("Should not allow the owner to set the randomised seed more than once", async function () {
      expect(await OriginalsContract.randomizedSeed()).to.equal(0)

      await OriginalsContract.connect(owner).setRandomizedSeed();

      await expect(OriginalsContract.connect(owner).setRandomizedSeed()).to.be.revertedWith("SeedAlreadySet()")
    });

    it("Should not allow anyone else to set the randomised seed", async function () {
      await expect(OriginalsContract.connect(addr1).setRandomizedSeed()).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("Should distribute the 4 artwork according to the set probabilities", async function () {
      this.timeout(0);

      for (let i = 0; i < 10; i++) {
        await OriginalsContract.connect(addrs[i]).mint(
          Array.from(Array(1000).keys()).map(x => x + 1 + (i * 1000))
        );
      }

      await OriginalsContract.connect(owner).setRandomizedSeed();

      let counts = {};
      for (let i = 1; i <= 10000; i++) {
        let uri = await OriginalsContract.tokenURI(i);
        if (!(uri in counts)) counts[uri] = 0;
        counts[uri]++;
      }

      console.log(counts);

      expect(counts["ipfs://QmTBHj4cYsWzynyk2V2Ahs3GtpViCQVki8KBywS3rev9L9"]).to.be.closeTo(100, 10, `Token 1 - ${counts[0]}`)
      expect(counts["ipfs://QmPJ2nEgGNQyxtwmMuJ9s4LLFfAjjqJzoFWVLFB7L2scNb"]).to.be.closeTo(1500, 100, `Token 2 - ${counts[1]}`)
      expect(counts["ipfs://QmR78rztM4n9axyRPuz4aEPYtgyVtsNUs1sb7rNbqh4Ty9"]).to.be.closeTo(3000, 100, `Token 3 - ${counts[2]}`)
      expect(counts["ipfs://QmRUUZQVcGAqFXKqtvWTs7P66qDrdNZzpPs75FtGfYrFHp"]).to.be.closeTo(5000, 300, `Token 4 - ${counts[3]}`)
    });
  })

  describe("Querying claim status", function () {
    beforeEach(deployContract);
    beforeEach(async function () {
      await OriginalsContract.connect(owner).toggleMintActive();
    })

    it("Should return the claim status of a list of bats", async function () {
      let batIds = Array.from(Array(100).keys()).map(x => x + 1);

      await OriginalsContract.connect(addrs[0]).mint(batIds)

      let batCanClaim = await OriginalsContract.canBatsClaim(batIds);
      batCanClaim.forEach(claimable => expect(claimable).to.be.false);

      let input = [25, 52, 123, 101, 100, 32, 1];
      batCanClaim = await OriginalsContract.canBatsClaim(input);
      expect(batCanClaim[0]).to.be.false;
      expect(batCanClaim[1]).to.be.false;
      expect(batCanClaim[2]).to.be.true;
      expect(batCanClaim[3]).to.be.true;
      expect(batCanClaim[4]).to.be.false;
      expect(batCanClaim[5]).to.be.false;
      expect(batCanClaim[6]).to.be.false;
    });
  })
});
