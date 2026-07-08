// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
    </div>
  );
}