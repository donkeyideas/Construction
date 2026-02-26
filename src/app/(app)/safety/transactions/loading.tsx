import TransactionSkeleton from "@/components/TransactionSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Safety Transactions</h2>
          <p className="fin-header-sub">Loading transactions...</p>
        </div>
      </div>
      <TransactionSkeleton />
    </div>
  );
}
