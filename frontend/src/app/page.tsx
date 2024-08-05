"use client";
import { useEffect } from "react";
import { wagerAbi, wagerAddress } from "@/constants";
import { toast } from "sonner";
import { parseEther } from "viem";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from "wagmi";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import BetCard from "@/components/BetCard";

interface BetInfo {
  id: bigint;
  title: string;
  threshold: bigint;
  totalPoolForExceed: bigint;
  totalPoolForNotExceed: bigint;
  epochEnded: boolean;
}

export default function Home() {
  const formSchema = z.object({
    title: z.string(),
    threshold: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      threshold: "",
    },
  });

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
    if (isPending) {
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

  const { data: allBets } = useReadContract({
    abi: wagerAbi,
    address: wagerAddress,
    functionName: "getAllBets",
  }) as { data: BetInfo[] | undefined };

  const createBet = async (data: z.infer<typeof formSchema>) => {
    try {
      const createBetTx = await writeContractAsync({
        address: wagerAddress,
        abi: wagerAbi,
        functionName: "createBet",
        args: [data.title, data.threshold],
      });

      console.log("created wager hash:", createBetTx);
      toast.success("Transaction Successful", {
        action: {
          label: "View on Etherscan",
          onClick: () => {
            window.open(
              `https://explorer-holesky.morphl2.io/tx/${createBetTx}`
            );
          },
        },
      });
    } catch (err: any) {
      toast.error("Transaction Failed: " + err.message);
      console.log("Transaction Failed: " + err.message);
    }
  };

  const placeBet = async (
    betId: number,
    betForExceed: boolean,
    betAmount: string
  ) => {
    try {
      console.log(betId, betForExceed, betAmount, "yess");
      const bet = parseEther(betAmount);
      const placeBetTx = await writeContractAsync({
        address: wagerAddress,
        abi: wagerAbi,
        functionName: "placeBet",
        args: [betId, betForExceed],
        value: bet,
      });

      console.log("Bet placed hash:", placeBetTx);
    } catch (err: any) {
      toast.error("Transaction Failed: " + err.message);
      console.log("Transaction Failed: " + err.message);
    }
  };

  const endEpoch = async (betId: number) => {
    const connection = new EvmPriceServiceConnection(
      "https://hermes.pyth.network"
    );

    const priceIds = [
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    ];

    const priceFeedUpdateData = await connection.getPriceFeedsUpdateData(
      priceIds
    );

    try {
      const feeAmount = parseEther("0.01");
      const endEpochTx = await writeContractAsync({
        address: wagerAddress,
        abi: wagerAbi,
        functionName: "endEpoch",
        args: [betId, priceFeedUpdateData as any],
        value: feeAmount,
      });

      console.log("end of epoch hash:", endEpochTx);
    } catch (err: any) {
      toast.error("Transaction Failed: " + err.message);
      console.log("Transaction Failed: " + err.message);
      console.log(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen  p-4">
      <h1 className="text-2xl font-bold mb-4">ETH Betting Dapp</h1>

      {/* Create Bet Form */}

      <div className=" flex flex-col w-full max-w-3xl  my-8   bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4">
        <h2 className="text-xl font-semibold mb-2">Create a New Bet</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(createBet)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="">
                    <h1 className="text-[#32393A]">Wager title</h1>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-full"
                      placeholder="abc.."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="">
                    <h1 className="text-[#32393A]">Threshold</h1>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-full"
                      placeholder="xyz"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              className="bg-[#007A86] self-center my-8 rounded-full w-full"
              size="lg"
              disabled={isConfirming}
              type="submit"
            >
              {isConfirming ? "Creating a wager..." : "Create a wager"}
            </Button>
          </form>
        </Form>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">All Bets</h2>
        {allBets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBets.map((bet) => (
              <BetCard
                bet={bet}
                key={bet.id.toString()}
                onPlaceBet={placeBet}
                onEndEpoch={endEpoch}
              />
            ))}
          </div>
        ) : (
          <p>Loading bets...</p>
        )}
      </div>
    </div>
  );
}
