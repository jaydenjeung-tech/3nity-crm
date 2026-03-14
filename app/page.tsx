import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <main className="flex flex-col items-center gap-8 rounded-2xl bg-white p-10 shadow-lg">

        {/* 치과 로고 */}
        <Image
          src="/logo.png"
          alt="Clinic Logo"
          width={180}
          height={180}
          priority
        />

        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to 3nity Dental CRM
        </h1>

        <p className="text-gray-600 text-center max-w-sm">
          Secure access for clinic staff to manage leads, patients, and treatment workflow.
        </p>

        {/* 로그인 버튼 */}
        <Link
          href="/login"
          className="rounded-xl bg-black px-6 py-3 text-white font-semibold hover:bg-gray-800"
        >
          Go to Login
        </Link>

      </main>
    </div>
  );
}