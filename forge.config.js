module.exports = {
  packagerConfig: {
    asar: true,
    icon: './build/icon', // .ico için Windows, .icns için macOS
    name: 'KankaAI',
    executableName: 'KankaAI',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'KankaAI',
        setupIcon: './build/icon.ico',
        iconUrl: 'https://raw.githubusercontent.com/electron/electron/main/default_app/icon.png', // Geçici
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
