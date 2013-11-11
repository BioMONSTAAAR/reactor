
import fabric
import os
from fabric.api import run, sudo, env, local, cd, lcd, put

env.user = 'pi'
env.hosts = ['rasman.local']

# Folder in remote host where the Rasman software will be copied to
APPROOT = '/home/' + env.user

def list():
    """Show all files/folders in the workspace where the job is deployed"""
    run('ls -lt %s' % APPROOT)

def clean():
    """Clean up your local folder in preparation for zipping up the source tree"""
    local("rm -f *.pyc .DS_Store */.DS_Store")
          
def zip():
    """Package the source tree"""
    clean()
    with lcd(".."):
        local("tar cvfz rasman.tgz rasman/")

def deploy():
    """Install and deploy on the Raspberry Pi"""
    zipfile = "%s/rasman.tgz" % APPROOT
    with cd(APPROOT):
        sudo('rm -rf rasman')
        put('../rasman.tgz', zipfile, use_sudo=False)
        sudo('tar xvfz %s' % zipfile)
        run('ls -lt .')
    
    