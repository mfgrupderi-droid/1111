const express = require("express");
const fs = require("fs");
const { print } = require("pdf-to-printer");

const router = express.Router();

router.post("/", async (req, res) => {
  const { text = "BOZKURTSAN", barcode = "123456789012" } = req.body;

  const command = `
^Q25,3
^W100
^H10
^P1
^S2
^L
A50,50,0,3,1,1,N,"${text}"
1E50,100,0,1,2,2,100,N,"${barcode}"
E
`;

  const filePath = "etiket.txt";
  fs.writeFileSync(filePath, command);

  try {
    await print(filePath, { printer: "Argox iX4-240 PPLB", raw: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Yazdırma hatası:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
