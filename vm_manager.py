import subprocess
import logging
import os
from typing import Dict, List, Union

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CommandResult = Dict[str, str]
VMConfig = Dict[str, Union[str, int]]


class VirtualBoxManager:
    def __init__(self):
        self.vboxmanage_path = r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"

        if not os.path.exists(self.vboxmanage_path):
            error_msg = "VBoxManage.exe not found at default location. Is VirtualBox installed?"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

        try:
            result = self._run_vbox_command(['--version'])
            if result['status'] != 'success':
                raise Exception(f"VirtualBox not working: {result['message']}")
            logger.info(f"Connected to VirtualBox (version: {result['output']})")
        except Exception as e:
            logger.error(f"Failed to connect to VirtualBox: {e}")
            raise

    def _run_vbox_command(self, command: List[str]) -> CommandResult:
        """Helper method to run VirtualBox commands"""
        try:
            full_command = [self.vboxmanage_path] + command
            result = subprocess.run(
                full_command,
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )

            if result.returncode != 0:
                return {
                    "status": "error",
                    "message": result.stderr.strip() or f"Command failed with exit code {result.returncode}"
                }
            return {
                "status": "success",
                "output": result.stdout.strip()
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Command execution failed: {str(e)}"
            }

    def create_vm(self, vm_config: VMConfig) -> CommandResult:
        """Create a new VirtualBox VM and attach ISO"""
        try:
            name = vm_config['name']
            os_type_map = {
                "ubuntu": "Ubuntu_64",
                "debian": "Debian_64",
                "windows": "Windows10_64"
            }
            iso_path_map = {
                "ubuntu": r"C:\ISOs\ubuntu-24.04.1-desktop-amd64.iso",
                "debian": r"C:\ISOs\kali-linux-2024.3-installer-amd64.iso",
                "windows": r"C:\ISOs\Win10_22H2_English_x64v1.iso"
            }

            os_key = vm_config.get('os', '').lower()
            os_type = os_type_map.get(os_key, "Ubuntu_64")
            iso_path = iso_path_map.get(os_key, "")

            if not os.path.exists(iso_path):
                return {
                    "status": "error",
                    "message": f"ISO file not found: {iso_path}. Please download and store it in C:\\ISOs."
                }

            # Create VM (without description parameter)
            steps = [
                (['createvm', '--name', name, '--ostype', os_type, '--register'], "Creating VM"),
                (['modifyvm', name, '--cpus', str(vm_config['cpu']),
                  '--memory', str(vm_config['ram'] * 1024), '--vram', '128'], "Configuring resources"),
                (['storagectl', name, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci'],
                 "Creating storage controller"),
                (['createmedium', 'disk', '--filename', f"{name}.vdi",
                  '--size', str(vm_config['storage'] * 1024), '--format', 'VDI'], "Creating disk"),
                (['storageattach', name, '--storagectl', 'SATA', '--port', '0',
                  '--device', '0', '--type', 'hdd', '--medium', f"{name}.vdi"], "Attaching storage"),
                (['storagectl', name, '--name', 'IDE', '--add', 'ide'], "Creating IDE controller"),
                (['storageattach', name, '--storagectl', 'IDE', '--port', '1', '--device', '0',
                  '--type', 'dvddrive', '--medium', iso_path], "Attaching ISO"),
                (['modifyvm', name, '--nic1', 'nat'], "Configuring network")
            ]

            for command, step_name in steps:
                logger.info(step_name)
                res = self._run_vbox_command(command)
                if res['status'] == 'error':
                    return res

            # Store owner information separately (you can use guest properties)
            owner_info = f"Owner: {vm_config.get('owner_email', '')} (ID: {vm_config.get('owner_id', '')})"
            self._run_vbox_command(['guestproperty', 'set', name, '/CloudVM/OwnerInfo', owner_info])

            return {
                "status": "success",
                "message": f"VM '{name}' created successfully",
                "vm_id": name,
                "owner_id": vm_config.get('owner_id', ''),
                "owner_email": vm_config.get('owner_email', '')
            }

        except KeyError as e:
            return {
                "status": "error",
                "message": f"Missing required configuration: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }

    def start_vm(self, vm_id: str, headless: bool = False) -> CommandResult:
        """Start a VM"""
        try:
            result = self._run_vbox_command([
                'startvm', vm_id, '--type', 'headless' if headless else 'gui'
            ])

            # Verify VM actually started
            if result['status'] == 'success':
                # Wait a moment for VM to start
                import time
                time.sleep(2)

                # Check VM state
                vms = self.list_vms()
                target_vm = next((vm for vm in vms if vm['id'] == vm_id), None)

                if target_vm and target_vm.get('state') != 'running':
                    return {
                        "status": "error",
                        "message": "VM failed to start (state not changed)"
                    }

            return result
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start VM: {str(e)}"
            }

    def stop_vm(self, vm_id: str) -> CommandResult:
        """Stop a running VM"""
        try:
            result = self._run_vbox_command(['controlvm', vm_id, 'poweroff'])

            # Verify VM actually stopped
            if result['status'] == 'success':
                # Wait a moment for VM to stop
                import time
                time.sleep(2)

                # Check VM state
                vms = self.list_vms()
                target_vm = next((vm for vm in vms if vm['id'] == vm_id), None)

                if target_vm and target_vm.get('state') == 'running':
                    return {
                        "status": "error",
                        "message": "VM failed to stop (still running)"
                    }

            return result
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to stop VM: {str(e)}"
            }


    def delete_vm(self, vm_id: str) -> CommandResult:
        """Delete a VM and its associated files"""
        # First unregister the VM
        unregister_result = self._run_vbox_command(['unregistervm', vm_id, '--delete'])

        if unregister_result['status'] == 'error':
            return unregister_result

        # Try to delete associated files
        medium_result = self._run_vbox_command(['closemedium', 'disk', f"{vm_id}.vdi", '--delete'])

        return {
            "status": "success",
            "message": f"VM {vm_id} and associated files deleted",
            "output": f"Unregister: {unregister_result.get('message', '')}\n"
                      f"Disk cleanup: {medium_result.get('message', '')}"
        }

    def list_vms(self) -> List[Dict[str, Union[str, int]]]:
        """List all VMs with their details"""
        res = self._run_vbox_command(['list', 'vms', '--long'])
        if res['status'] == 'error':
            return []

        vms = []
        current_vm = None
        in_vm_block = False

        for line in res['output'].splitlines():
            line = line.strip()

            # Skip empty lines and non-VM entries
            if not line or line.startswith(('after', 'sudo', '*')) or 'UUID:' in line and not in_vm_block:
                continue

            # Start of a new VM block
            if line.startswith('Name:'):
                if current_vm:
                    # Get owner info before moving to next VM
                    owner_result = self._run_vbox_command(
                        ['guestproperty', 'get', current_vm['name'], '/CloudVM/OwnerInfo'])
                    if owner_result['status'] == 'success' and 'Value:' in owner_result['output']:
                        owner_info = owner_result['output'].split(':', 1)[1].strip()
                        current_vm['owner_info'] = owner_info

                    vms.append(current_vm)

                current_vm = {
                    'name': line.split(':', 1)[1].strip().strip('"'),
                    'state': 'poweroff',
                    'storage': 0,
                    'ram': 0,
                    'cpu': 1,
                    'ostype': 'Unknown'
                }
                in_vm_block = True
            elif in_vm_block and current_vm:
                if line.startswith('UUID:'):
                    current_vm['id'] = line.split(':', 1)[1].strip().strip('"')
                elif line.startswith('State:'):
                    state = line.split(':', 1)[1].strip().lower()
                    current_vm['state'] = 'running' if 'running' in state else 'poweroff'
                elif line.startswith('Memory size:'):
                    current_vm['ram'] = int(line.split(':', 1)[1].strip().replace('MB', '').strip('"')) // 1024
                elif line.startswith('Number of CPUs:'):
                    current_vm['cpu'] = int(line.split(':', 1)[1].strip().strip('"'))
                elif line.startswith('Capacity:'):
                    size_mb = int(line.split(':', 1)[1].strip().split()[0].strip('"'))
                    current_vm['storage'] = size_mb // 1024
                elif line.startswith('OSType:'):
                    current_vm['ostype'] = line.split(':', 1)[1].strip().strip('"')

        if current_vm:
            # Get owner info for the last VM
            owner_result = self._run_vbox_command(['guestproperty', 'get', current_vm['name'], '/CloudVM/OwnerInfo'])
            if owner_result['status'] == 'success' and 'Value:' in owner_result['output']:
                owner_info = owner_result['output'].split(':', 1)[1].strip()
                current_vm['owner_info'] = owner_info

            vms.append(current_vm)

        # Filter out any invalid entries
        valid_vms = []
        for vm in vms:
            if all(key in vm for key in ['name', 'id', 'state']):
                # Skip entries that look like commands or status messages
                if not any(x in vm['name'].lower() for x in ['sudo', 'apt', 'upgrade', 'after', 'success']):
                    # Parse owner info if available
                    if 'owner_info' in vm:
                        owner_parts = vm['owner_info'].split('(ID:')
                        if len(owner_parts) > 1:
                            vm['owner_email'] = owner_parts[0].replace('Owner:', '').strip()
                            vm['owner_id'] = owner_parts[1].replace(')', '').strip()
                    valid_vms.append(vm)

        return valid_vms

    def get_vm_ip(self, vm_id: str) -> str:
        """Get the IP address of a running VM"""
        result = self._run_vbox_command(['guestproperty', 'get', vm_id, '/VirtualBox/GuestInfo/Net/0/V4/IP'])
        if result['status'] == 'success' and 'Value:' in result['output']:
            return result['output'].split(':', 1)[1].strip()
        return 'N/A'
