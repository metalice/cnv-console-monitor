import { Content, Flex, FlexItem, FormGroup, Label, TextInput } from '@patternfly/react-core';

import { type AIStatus } from '../../api/ai';
import { HelpLabel } from '../common/HelpLabel';

type AIVertexSectionProps = {
  vertexProjectId: string;
  vertexRegion: string;
  vertexAccessToken: string;
  tokenInfo: AIStatus['vertexTokenInfo'];
  onProjectIdChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onAccessTokenChange: (value: string) => void;
};

const TOKEN_EXPIRY_WARN_SECONDS = 300;

const TokenExpiryLabel = ({ expiresIn }: { expiresIn: number | null }) => {
  if (expiresIn === null)
    return (
      <Label isCompact color="grey">
        Unknown
      </Label>
    );
  if (expiresIn <= 0)
    return (
      <Label isCompact color="red">
        Expired
      </Label>
    );
  const color = expiresIn < TOKEN_EXPIRY_WARN_SECONDS ? 'orange' : 'green';
  return (
    <Label isCompact color={color}>
      {Math.floor(expiresIn / 60)}m {expiresIn % 60}s
    </Label>
  );
};

const AUTH_MODE_LABELS: Record<string, string> = {
  adc: 'ADC',
  manual: 'Manual token',
  none: 'None',
};

const VertexTokenStatus = ({ info }: { info: NonNullable<AIStatus['vertexTokenInfo']> }) => (
  <div className="app-mb-md">
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'wrap' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem>
        <Content className="app-text-muted" component="small">
          ADC:{' '}
          <Label isCompact color={info.adcAvailable ? 'green' : 'grey'}>
            {info.adcAvailable ? 'Available (auto-refresh)' : 'Not found'}
          </Label>
        </Content>
      </FlexItem>
      <FlexItem>
        <Content className="app-text-muted" component="small">
          Token:{' '}
          {info.hasManualToken ? (
            <TokenExpiryLabel expiresIn={info.expiresIn} />
          ) : (
            <Label isCompact color="grey">
              Not set
            </Label>
          )}
        </Content>
      </FlexItem>
      <FlexItem>
        <Content className="app-text-muted" component="small">
          Active:{' '}
          <Label isCompact color={info.authMode === 'none' ? 'red' : 'blue'}>
            {AUTH_MODE_LABELS[info.authMode] ?? info.authMode}
          </Label>
        </Content>
      </FlexItem>
      {info.email && (
        <FlexItem>
          <Content className="app-text-muted" component="small">
            {info.email}
          </Content>
        </FlexItem>
      )}
    </Flex>
  </div>
);

export const AIVertexSection = ({
  onAccessTokenChange,
  onProjectIdChange,
  onRegionChange,
  tokenInfo,
  vertexAccessToken,
  vertexProjectId,
  vertexRegion,
}: AIVertexSectionProps) => (
  <>
    <Content className="app-mb-sm app-mt-md" component="h5">
      Vertex AI (Claude)
    </Content>

    <FormGroup
      className="app-mb-sm"
      label={
        <HelpLabel
          help="Your Google Cloud project ID that has Vertex AI and Claude models enabled."
          label="GCP Project ID"
        />
      }
    >
      <TextInput
        className="app-max-w-350"
        placeholder="my-gcp-project"
        value={vertexProjectId}
        onChange={(_e, value) => onProjectIdChange(value)}
      />
    </FormGroup>

    <FormGroup
      className="app-mb-sm"
      label={
        <HelpLabel
          help="Vertex AI region. Claude is available in us-east5, europe-west1, etc."
          label="Region"
        />
      }
    >
      <TextInput
        className="app-max-w-350"
        placeholder="us-east5"
        value={vertexRegion}
        onChange={(_e, value) => onRegionChange(value)}
      />
    </FormGroup>

    <FormGroup
      className="app-mb-sm"
      label={
        <HelpLabel
          help="GCP access token. Get via: gcloud auth print-access-token. Tokens expire after 1 hour."
          label="Access Token"
        />
      }
    >
      <TextInput
        className="app-max-w-350"
        placeholder="ya29...."
        type="password"
        value={vertexAccessToken}
        onChange={(_e, value) => onAccessTokenChange(value)}
      />
    </FormGroup>

    {tokenInfo && <VertexTokenStatus info={tokenInfo} />}
  </>
);
