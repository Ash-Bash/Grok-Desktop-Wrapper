module.exports = {
    "appId": "com.ashleychapman.wrapper.grokdesktop",
    "productName": "Grok Desktop",
    "win": {
        "target": [  
            {
                "target": "nsis",
                "arch": [
                    "x64", 
                    "ia32", 
                    "arm64"
                ]
            }
        ]
    },
    "mac": {
        "target": [ 
            {
                "target": "dmg",
                "arch": [
                    "universal" 
                ]
            }
        ]
    },
    "linux": {
        "target": [ 
            {
                "target": ["deb", "AppImage"],
                "arch": [
                    "x64",
                    "armv7l", 
                    "arm64"
                ]
            }
        ]
    },
    "directories": {
      "output": "./dists"
    }
}