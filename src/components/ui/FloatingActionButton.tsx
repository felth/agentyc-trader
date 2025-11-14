type FloatingActionButtonProps = {
  onClick?: () => void;
  label?: string;
};

export function FloatingActionButton({ onClick, label = "+" }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-[#F56300] flex items-center justify-center text-black text-2xl shadow-[0_18px_45px_rgba(245,99,0,0.7)] active:scale-95 transition"
    >
      {label}
    </button>
  );
}

