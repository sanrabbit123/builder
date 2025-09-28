import subprocess
import time
import sys
import os
import shutil
from pathlib import Path
from os import path as osPath

class PythonInstall:
    def __init__(self):
        self.install = [
            [ "html5lib" ],
            [ "aiohttp" ],
            [ "aiofiles" ],
            [ "getmac" ],
            [ "netifaces" ],
            [ "apscheduler" ],
            [ "fonttools" ],
        ]

        self.homeDir = str(Path.home())
        now = time.gmtime(time.time())
        tempDirName = "pythonModuleInstall" + str(now.tm_year) + str(now.tm_mon) + str(now.tm_mday) + str(now.tm_hour) + str(now.tm_min) + str(now.tm_sec)
        self.tempDir = self.homeDir + "/" + tempDirName
        thisFileArr = os.getcwd().split('/')
        self.rabbitPath = '/'.join(thisFileArr)

    def setTempDir(self):
        os.makedirs(self.tempDir)

    def moduleInstall(self, local=True):
        target = "--target=" + self.tempDir
        for module in self.install:
            commandList = []
            commandList.append("pip3")
            commandList.append("install")
            for m in module:
                commandList.append(m)
            commandList.append(target)
            subprocess.run(commandList, shell=False, encoding='utf8')

    def installServer(self):
        self.setTempDir()
        self.moduleInstall(local=True)

try:
    installApps = PythonInstall()
    installApps.installServer()

except Exception as e:
    print(e)
    sys.exit()
