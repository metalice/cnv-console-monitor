import { Button, Card, CardBody, CardTitle, Content, Flex, FlexItem } from '@patternfly/react-core';
import { DownloadIcon, MoonIcon, SunIcon, UploadIcon } from '@patternfly/react-icons';

import { fetchSettings, updateSettings } from '../../api/settings';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../context/ToastContext';
import { SearchableSelect } from '../common/SearchableSelect';

import { SettingsChangelog } from './SettingsChangelog';

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'auto' },
];

type AboutSectionProps = {
  isAdmin: boolean;
};

export const AboutSection = ({ isAdmin }: AboutSectionProps) => {
  const { preferences, setPreference } = usePreferences();
  const { addToast } = useToast();

  const handleExport = async () => {
    try {
      const settingsData = await fetchSettings();
      const exportData: Record<string, string> = {};
      for (const [key, entry] of Object.entries(settingsData.settings)) {
        if (!key.includes('token') && !key.includes('pass') && !key.includes('secret')) {
          exportData[key] = entry.value;
        }
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `cnv-monitor-settings-${new Date().toISOString().split('T')[0]}.json`;
      downloadLink.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Settings exported (tokens excluded)');
    } catch {
      addToast('danger', 'Failed to export settings');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Record<string, string>;
        await updateSettings(imported);
        addToast('success', `Imported ${Object.keys(imported).length} settings`);
        window.location.reload();
      } catch (err) {
        addToast('danger', err instanceof Error ? err.message : 'Invalid settings file');
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardTitle>About</CardTitle>
      <CardBody>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mb-md"
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsLg' }}
        >
          <FlexItem>
            <Content className="app-text-muted" component="small">
              CNV Console Monitor
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>{preferences.theme === 'dark' ? <MoonIcon /> : <SunIcon />}</FlexItem>
              <FlexItem>
                <SearchableSelect
                  id="theme-select"
                  options={THEME_OPTIONS}
                  placeholder="Theme"
                  value={preferences.theme || 'auto'}
                  onChange={themeValue =>
                    setPreference('theme', themeValue as 'light' | 'dark' | 'auto')
                  }
                />
              </FlexItem>
            </Flex>
          </FlexItem>
          {isAdmin && (
            <>
              <FlexItem>
                <Button
                  icon={<DownloadIcon />}
                  size="sm"
                  variant="secondary"
                  onClick={handleExport}
                >
                  Export Settings
                </Button>
              </FlexItem>
              <FlexItem>
                <Button icon={<UploadIcon />} size="sm" variant="secondary" onClick={handleImport}>
                  Import Settings
                </Button>
              </FlexItem>
            </>
          )}
        </Flex>
        {isAdmin && <SettingsChangelog />}
      </CardBody>
    </Card>
  );
};
