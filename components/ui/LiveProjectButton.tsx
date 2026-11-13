type LiveProjectButtonProps = {
  href: string;
  label?: string;
};

/** Ghost pill button from the template (external link). */
export function LiveProjectButton({
  href,
  label = "Live Project",
}: LiveProjectButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-mist inline-block rounded-full border-2 border-[#D7E2EA] px-8 py-3 text-sm font-medium tracking-widest whitespace-nowrap uppercase transition-colors duration-200 hover:bg-[#D7E2EA]/10 sm:px-10 sm:py-3.5 sm:text-base"
    >
      {label}
    </a>
  );
}
