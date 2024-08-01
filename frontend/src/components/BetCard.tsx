import { formatEther } from "viem";
import { Button } from "./ui/button";
import PlaceBetModal from "./BetModal";

interface BetProps {
  bet: {
    id: bigint;
    title: string;
    threshold: bigint;
    totalPoolForExceed: bigint;
    totalPoolForNotExceed: bigint;
    epochEnded: boolean;
  };

  onPlaceBet: (betId: number, betForExceed: boolean, amount: string) => void;
  onEndEpoch: (betId: number) => void;
}

const BetCard: React.FC<BetProps> = ({ bet, onPlaceBet, onEndEpoch }) => {
  return (
    <div className="border border-gray-600 p-6 rounded-lg shadow-lg bg-white/5 backdrop-blur-md mt-8">
      <div className="">
        <h3 className="text-xl font-bold text-gray-100 mb-2">{bet.title}</h3>
        <div className="text-gray-500 mb-2">
          <p className="">ID: {bet.id.toString()}</p>
          <p className="">Threshold: {formatEther(bet.threshold)} ETH</p>
          <p className="">
            Pool for Exceed: {formatEther(bet.totalPoolForExceed)} ETH
          </p>
          <p className="">
            Pool for Not Exceed: {formatEther(bet.totalPoolForNotExceed)} ETH
          </p>
        </div>
        <p
          className={`text-sm font-semibold ${
            bet.epochEnded ? "text-red-500" : "text-green-500"
          }`}
        >
          Status: {bet.epochEnded ? "Ended" : "Active"}
        </p>
      </div>

      <div className="mt-4 flex space-x-4">
        <PlaceBetModal
          betId={Number(bet.id.toString())}
          onPlaceBet={onPlaceBet}
        >
          <Button
            onClick={() => {}}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Place Bet
          </Button>
        </PlaceBetModal>

        <Button
          onClick={() => onEndEpoch(Number(bet.id.toString()))}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          End Epoch
        </Button>
      </div>
    </div>
  );
};

export default BetCard;
