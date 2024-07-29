"use client";
import { useEffect } from "react";
import { wagerAbi, wagerAddress } from "@/constants";
import { toast } from "sonner";
import { parseUnits, parseEther } from "viem";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

export default function Home() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Transaction Pending");
    }
    if (isConfirmed) {
      toast.success("Transaction Successful", {
        action: {
          label: "View on Etherscan",
          onClick: () => {
            window.open(`https://explorer-holesky.morphl2.io/tx/${hash}`);
          },
        },
      });
    }
    if (error) {
      toast.error("Transaction Failed");
    }
  }, [isConfirming, isConfirmed, error, hash]);

  const PlaceBet = async (betForExceed: boolean) => {
    try {
      const betAmount = parseEther("0.0001");
      const placeBetTx = await writeContractAsync({
        address: wagerAddress,
        abi: wagerAbi,
        functionName: "placeBet",
        args: [betForExceed],
        value: betAmount,
      });

      console.log("property transaction hash:", placeBetTx);
    } catch (err: any) {
      toast.error("Transaction Failed: " + err.message);
      console.log("Transaction Failed: " + err.message);
    }
  };

  const endEpoch = async () => {
    const connection = new EvmPriceServiceConnection(
      "https://hermes.pyth.network"
    );

    const priceIds = [
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    ];

    const priceFeedUpdateData = await connection.getPriceFeedsUpdateData(
      priceIds
    );

    console.log("yoo", priceFeedUpdateData);

    try {
      const feeAmount = parseEther("0.001");
      const endEpochTx = await writeContractAsync({
        address: wagerAddress,
        abi: wagerAbi,
        functionName: "endEpoch",
        args: [priceFeedUpdateData as any],
        value: feeAmount,
      });

      console.log("haa:", endEpochTx);
    } catch (err: any) {
      toast.error("Transaction Failed: " + err.message);
      console.log("Transaction Failed: " + err.message);
      console.log(err);
    }
  };

  return (
    <main>
      <section className="py-12 flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center justify-center min-h-screen ">
          <h1 className="text-4xl font-bold mb-4">Morph Wager</h1>
          <p className="text-xl mb-8">Will the price of ETH exceed $3500?</p>
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => PlaceBet(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-lg"
            >
              Yes
            </button>
            <button
              onClick={() => PlaceBet(false)}
              className="px-6 py-3 bg-red-500 text-white rounded-lg"
            >
              No
            </button>
          </div>
          <button
            onClick={endEpoch}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg"
          >
            End Epoch
          </button>
        </div>
      </section>
    </main>
  );
}
