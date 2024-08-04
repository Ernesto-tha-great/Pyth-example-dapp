// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

contract EthBettingDapp {
    IPyth public pyth;
    bytes32 public ethUsdPriceId;

    struct Bet {
        uint id;
        string title;
        uint threshold;
        uint totalPoolForExceed;
        uint totalPoolForNotExceed;
        bool epochEnded;
        address[] bettors;
        mapping(address => UserBet) userBets;
    }

    struct UserBet {
        uint amount;
        bool betForExceed;
    }

     struct BetInfo {
        uint id;
        string title;
        uint threshold;
        uint totalPoolForExceed;
        uint totalPoolForNotExceed;
        bool epochEnded;
    }



    uint public nextBetId;
    mapping(uint => Bet) public bets;
    
    event BetCreated(uint indexed betId, string title, uint threshold);
    event BetPlaced(uint indexed betId, address indexed user, uint amount, bool betForExceed);
    event EpochEnded(uint indexed betId, uint finalPrice, bool exceeded);
    event RewardTransferred(address indexed bettor, uint reward);

    /**
     * Network: Morph Holesky 
     * Address: 0x2880aB155794e7179c9eE2e38200202908C17B43
     */

    constructor() {
        pyth = IPyth(0x2880aB155794e7179c9eE2e38200202908C17B43);
        ethUsdPriceId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    }

    modifier onlyBeforeEpochEnd(uint betId) {
        require(!bets[betId].epochEnded, "Betting period has ended");
        _;
    }

    modifier onlyAfterEpochEnd(uint betId) {
        require(bets[betId].epochEnded, "Epoch is still ongoing");
        _;
    }

    function createBet(string memory title, uint threshold) public {
        Bet storage newBet = bets[nextBetId];
        newBet.id = nextBetId;
        newBet.title = title;
        newBet.threshold = threshold * 10**18; // Set threshold with 18 decimals

        emit BetCreated(nextBetId, title, threshold);
        nextBetId++;
    }

    function placeBet(uint betId, bool _betForExceed) public payable onlyBeforeEpochEnd(betId) {
        require(msg.value > 0, "Bet amount must be greater than 0");

        Bet storage bet = bets[betId];

        if (bet.userBets[msg.sender].amount == 0) {
            bet.bettors.push(msg.sender);
        }

        bet.userBets[msg.sender].amount += msg.value;
        bet.userBets[msg.sender].betForExceed = _betForExceed;
        if (_betForExceed) {
            bet.totalPoolForExceed += msg.value;
        } else {
            bet.totalPoolForNotExceed += msg.value;
        }

        emit BetPlaced(betId, msg.sender, msg.value, _betForExceed);
    }

    function endEpoch(uint betId, bytes[] calldata pythPriceUpdate) public payable onlyBeforeEpochEnd(betId) {
        Bet storage bet = bets[betId];
        require(!bet.epochEnded, "Epoch already ended");

        uint updateFee = pyth.getUpdateFee(pythPriceUpdate);
        pyth.updatePriceFeeds{value: updateFee}(pythPriceUpdate);

        PythStructs.Price memory price = pyth.getPrice(ethUsdPriceId);
        uint ethPrice18Decimals = (uint(uint64(price.price)) * (10 ** 18)) / (10 ** uint8(uint32(-1 * price.expo)));

        bool priceExceeded = ethPrice18Decimals > bet.threshold;

        distributeRewards(betId, priceExceeded);
        bet.epochEnded = true;

        emit EpochEnded(betId, ethPrice18Decimals, priceExceeded);
    }

    function distributeRewards(uint betId, bool priceExceeded) private {
        Bet storage bet = bets[betId];
        uint winnersTotalBet = priceExceeded ? bet.totalPoolForExceed : bet.totalPoolForNotExceed;
        if (winnersTotalBet == 0) return; // No winners

        uint losersTotalBet = priceExceeded ? bet.totalPoolForNotExceed : bet.totalPoolForExceed;
        uint totalPool = winnersTotalBet + losersTotalBet;

        for (uint i = 0; i < bet.bettors.length; i++) {
            address bettor = bet.bettors[i];
            if (bet.userBets[bettor].betForExceed == priceExceeded) {
                uint reward = (bet.userBets[bettor].amount * totalPool) / winnersTotalBet;
                (bool success, ) = payable(bettor).call{value: reward}("");
                require(success, "Transfer failed");
                emit RewardTransferred(bettor, reward);
            }
        }
    }

     function getAllBets() public view returns (BetInfo[] memory) {
        BetInfo[] memory allBets = new BetInfo[](nextBetId);
        for (uint i = 0; i < nextBetId; i++) {
            Bet storage bet = bets[i];
            allBets[i] = BetInfo({
                id: bet.id,
                title: bet.title,
                threshold: bet.threshold,
                totalPoolForExceed: bet.totalPoolForExceed,
                totalPoolForNotExceed: bet.totalPoolForNotExceed,
                epochEnded: bet.epochEnded
            });
        }
        return allBets;
     }
    

    function getBetAmount(uint betId, address user) external view returns (uint) {
        return bets[betId].userBets[user].amount;
    }

    function getBetPosition(uint betId, address user) external view returns (bool) {
        return bets[betId].userBets[user].betForExceed;
    }

    function getTotalPoolForExceed(uint betId) external view returns (uint) {
        return bets[betId].totalPoolForExceed;
    }

    function getTotalPoolForNotExceed(uint betId) external view returns (uint) {
        return bets[betId].totalPoolForNotExceed;
    }

    function getBettors(uint betId) external view returns (address[] memory) {
        return bets[betId].bettors;
    }
}
