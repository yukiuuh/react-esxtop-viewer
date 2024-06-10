import { CdsProgressCircle } from "@cds/react/progress-circle";
import { CdsInternalOverlay } from "@cds/react/internal-components/overlay";

type Props = {
  loading: boolean;
};

const LoadingOverlay: React.FC<Props> = (props) => {
  const { loading } = props;
  return (
    <CdsInternalOverlay hidden={!loading}>
      <CdsProgressCircle size="xl" status="info" />
    </CdsInternalOverlay>
  );
};

export default LoadingOverlay;
