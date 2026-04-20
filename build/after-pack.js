const fs = require("fs");
const path = require("path");
const ResEdit = require("resedit");
const PELibrary = require("pe-library");

module.exports = async function applyWindowsExecutableIcon(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const projectDir = context.packager.projectDir;
  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(projectDir, "build", "icon.ico");
  for (const requiredPath of [exePath, iconPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Missing Windows icon build dependency: ${requiredPath}`);
    }
  }

  const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const resources = PELibrary.NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));

  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    1,
    1033,
    iconFile.icons.map((item) => item.data)
  );

  resources.outputResource(exe);

  const outputPath = `${exePath}.icon`;
  fs.writeFileSync(outputPath, Buffer.from(exe.generate()));
  fs.renameSync(outputPath, exePath);
};
