type FloatingActionButtonProps = {
  onClick?: () => void;
  label?: string;
};

export function FloatingActionButton({ onClick, label = "+" }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 w-16 h-16 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center text-black text-3xl font-light shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white active:scale-95 transition border border-white/20"
      aria-label="Add new"
    >
      {label}
    </button>
  );
}

