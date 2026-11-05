import { Link, useLocation, type LinkProps } from 'react-router-dom';

export function DocsLink(props: Omit<LinkProps, 'to' | 'state'>) {
  const location = useLocation();
  return <Link {...props} to="/docs" state={{ docsBackgroundLocation: location }} />;
}
