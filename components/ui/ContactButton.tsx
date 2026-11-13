type ContactButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

/** Gradient pill button from the template. */
export function ContactButton({
  href = "#contact",
  label = "Contact Me",
  className = "",
}: ContactButtonProps) {
  return (
    <a
      href={href}
      className={`inline-block rounded-full px-8 py-3 text-xs font-medium tracking-widest whitespace-nowrap text-white uppercase transition-[filter] duration-200 hover:brightness-110 sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
      style={{
        background:
          "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
        boxShadow:
          "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
        outline: "2px solid #FFFFFF",
        outlineOffset: "-3px",
      }}
    >
      {label}
    </a>
  );
}
