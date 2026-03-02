import { motion } from "framer-motion";
import { ReactNode } from "react";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 18,
    scale: 0.98,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.985,
    filter: "blur(3px)",
  },
};

const springTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.6,
  restDelta: 0.001,
};

const exitTransition = {
  duration: 0.18,
  ease: [0.4, 0, 1, 1],
};

export default function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        ...springTransition,
        opacity: { duration: 0.22, ease: "easeOut" },
        filter: { duration: 0.25, ease: "easeOut" },
      }}
      style={{ willChange: "transform, opacity, filter" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
