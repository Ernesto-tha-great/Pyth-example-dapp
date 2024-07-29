// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

contract EthBettingDapp {
    IPyth public pyth;
    bytes32 public ethUsdPriceId;

    uint public betThreshold = 3500 * 10**18; // $3500 with 18 decimals
    uint public totalPoolForExceed;
    uint public totalPoolForNotExceed;
    bool public epochEnded;

    struct Bet {
        uint amount;
        bool betForExceed;
    }

    mapping(address => Bet) public bets;
    address[] public bettors;
    
    event BetPlaced(address indexed user, uint amount, bool betForExceed);
    event EpochEnded(uint finalPrice, bool exceeded);

    /**
     * Network: Morph Holesky 
     * Address:0x2880aB155794e7179c9eE2e38200202908C17B43
     */

    constructor() {
        pyth = IPyth(0x2880aB155794e7179c9eE2e38200202908C17B43);
        ethUsdPriceId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
        epochEnded = false;
    }

    modifier onlyBeforeEpochEnd() {
        require(!epochEnded, "Betting period has ended");
        _;
    }

    modifier onlyAfterEpochEnd() {
        require(epochEnded, "Epoch is still ongoing");
        _;
    }

    function placeBet(bool _betForExceed) external payable onlyBeforeEpochEnd {
        require(msg.value > 0, "Bet amount must be greater than 0");

        if (bets[msg.sender].amount == 0) {
            bettors.push(msg.sender);
        }

        bets[msg.sender].amount += msg.value;
        bets[msg.sender].betForExceed = _betForExceed;
        if (_betForExceed) {
            totalPoolForExceed += msg.value;
        } else {
            totalPoolForNotExceed += msg.value;
        }

        emit BetPlaced(msg.sender, msg.value, _betForExceed);
    }

    function endEpoch(bytes[] calldata pythPriceUpdate) public payable onlyBeforeEpochEnd {
        require(!epochEnded, "Epoch already ended");

        uint updateFee = pyth.getUpdateFee(pythPriceUpdate);
        pyth.updatePriceFeeds{value: updateFee}(pythPriceUpdate);

        PythStructs.Price memory price = pyth.getPrice(ethUsdPriceId);
        uint ethPrice18Decimals = (uint(uint64(price.price)) * (10 ** 18)) / (10 ** uint8(uint32(-1 * price.expo)));

        bool priceExceeded = ethPrice18Decimals > betThreshold;

        distributeRewards(priceExceeded);
        epochEnded = true;

        emit EpochEnded(ethPrice18Decimals, priceExceeded);
    }

    function distributeRewards(bool priceExceeded) private {
        uint winnersTotalBet = priceExceeded ? totalPoolForExceed : totalPoolForNotExceed;
        if (winnersTotalBet == 0) return; // No winners

        uint losersTotalBet = priceExceeded ? totalPoolForNotExceed : totalPoolForExceed;
        uint totalPool = winnersTotalBet + losersTotalBet;

        for (uint i = 0; i < bettors.length; i++) {
            if (bets[bettors[i]].betForExceed == priceExceeded) {
                uint reward = (bets[bettors[i]].amount * totalPool) / winnersTotalBet;
                payable(bettors[i]).transfer(reward);
            }
        }
    }

    function getBetAmount(address user) external view returns (uint) {
        return bets[user].amount;
    }

    function getBetPosition(address user) external view returns (bool) {
        return bets[user].betForExceed;
    }

    function getTotalPoolForExceed() external view returns (uint) {
        return totalPoolForExceed;
    }

    function getTotalPoolForNotExceed() external view returns (uint) {
        return totalPoolForNotExceed;
    }

    function getBettors() external view returns (address[] memory) {
        return bettors;
    }
}
