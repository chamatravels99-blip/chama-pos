const CODE_39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwnn",
  S: "nnwnnnwnn", T: "nnnnwnwnn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
  "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

const BAR_UNIT_MM = 0.16;

export function InvoiceBarcode({ value }: { value: string }) {
  const barcodeValue = value.toUpperCase().replace(/[^0-9A-Z. $/+%-]/g, "");
  if (!barcodeValue) return null;

  return (
    <div className="invoice-barcode" aria-label={`Barcode for ${barcodeValue}`}>
      <div className="invoice-barcode-bars" aria-hidden="true">
        {`*${barcodeValue}*`.split("").map((character, characterIndex) => (
          <span className="invoice-barcode-character" key={`${character}-${characterIndex}`}>
            {CODE_39[character].split("").map((width, elementIndex) => (
              <span
                className={elementIndex % 2 === 0 ? "invoice-barcode-bar" : "invoice-barcode-space"}
                key={elementIndex}
                style={{ width: `${BAR_UNIT_MM * (width === "w" ? 3 : 1)}mm` }}
              />
            ))}
          </span>
        ))}
      </div>
      <span className="invoice-barcode-value">{barcodeValue}</span>
    </div>
  );
}