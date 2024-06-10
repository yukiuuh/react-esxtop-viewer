import { ClarityIcons, lineChartIcon } from "@cds/core/icon";
import { CdsIcon } from "@cds/react/icon";
import { ChangeEvent, useEffect, useState } from "react";

type Props = {
  onFilterKeywordChange?: (keyword: string) => void;
};

const INPUT_DELAY_MSEC = 500;
ClarityIcons.addIcons(lineChartIcon);
const Header: React.FC<Props> = (props) => {
  const [inputValue, setInputValue] = useState("");
  const _onFilterKeywordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      props.onFilterKeywordChange && props.onFilterKeywordChange(inputValue);
    }, INPUT_DELAY_MSEC);
    return () => clearTimeout(timer);
  }, [inputValue, props]);

  return (
    <header className="header header-6">
      <div className="branding">
        <a>
          <CdsIcon shape="line-chart" />
          <span className="title">esxtop Viewer</span>
        </a>
      </div>
      <form
        className="search"
        autoComplete="off"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="search-input-header">
          <input
            id="search-input-header"
            type="text"
            value={inputValue}
            onChange={_onFilterKeywordChange}
            placeholder="Filtering..."
          />
        </label>
      </form>
    </header>
  );
};

export default Header;
