/**
 * BurgerMenu Component
 * Animated hamburger menu icon
 */

interface BurgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
}

export function BurgerMenu({ isOpen, onClick }: BurgerMenuProps) {
  const barStyle = (animation: string) => ({
    animation: `${animation} 0.6s ease-in-out forwards`,
  });

  return (
    <button
      onClick={onClick}
      className="relative w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity z-50"
      aria-label="Menu"
      aria-expanded={isOpen}
    >
      <div className="w-6 h-4 flex flex-col justify-between items-end">
        <span
          className="block w-6 h-0.5 bg-white rounded-full"
          style={barStyle(isOpen ? 'burgerTopClose' : 'burgerTopOpen')}
        />
        <span
          className="block w-6 h-0.5 bg-white rounded-full"
          style={barStyle(isOpen ? 'burgerBottomClose' : 'burgerBottomOpen')}
        />
      </div>

      <style>{`
        @keyframes burgerTopClose {
          0% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(7.5px) rotate(0); }
          100% { transform: translateY(7.5px) rotate(45deg); }
        }
        @keyframes burgerBottomClose {
          0% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-7.5px) rotate(0); }
          100% { transform: translateY(-7.5px) rotate(-45deg); }
        }
        @keyframes burgerTopOpen {
          0% { transform: translateY(7.5px) rotate(45deg); }
          50% { transform: translateY(7.5px) rotate(0); }
          100% { transform: translateY(0) rotate(0); }
        }
        @keyframes burgerBottomOpen {
          0% { transform: translateY(-7.5px) rotate(-45deg); }
          50% { transform: translateY(-7.5px) rotate(0); }
          100% { transform: translateY(0) rotate(0); }
        }
      `}</style>
    </button>
  );
}

export default BurgerMenu;
