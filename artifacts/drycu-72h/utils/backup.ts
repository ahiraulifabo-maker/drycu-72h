import { Platform } from 'react-native';

// Function to export all data to a JSON file (Data Safe Rasta)
export function exportBackupData(data: any, fileName = 'drycu72h_backup.json') {
  if (Platform.OS !== 'web') return;
  
  const jsonString = data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))};
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Function to import back the backup data
export function importBackupData(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        resolve(parsedData);
      } catch (e) {
        reject('Invalid Backup File');
      }
    };
    reader.onerror = () => reject('File reading error');
    reader.readAsText(file);
  });
}
