import { CdsProgressCircle } from "@cds/react/progress-circle";
import { CdsInternalOverlay } from "@cds/react/internal-components/overlay";

type Props = {
  loading: boolean;
  message: string;
};

const LoadingOverlay: React.FC<Props> = (props) => {
  const { loading, message } = props;
  return (
    <CdsInternalOverlay hidden={!loading}>
      <div cds-layout="vertical align:horizontal-center gap:md">
        <CdsProgressCircle size="xl" status="info" />
        <p cds-text="title" color="var(--cds-global-typography-neutral-hover)">{message}</p>
      </div>
    </CdsInternalOverlay>
  );
};

export default LoadingOverlay;
