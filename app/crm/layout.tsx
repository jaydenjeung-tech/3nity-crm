import CRMTopNav from "./CRMTopNav";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6 md:py-8">
        <div className="grid gap-5">
          <CRMTopNav />
          {children}
        </div>
      </div>
    </main>
  );
}