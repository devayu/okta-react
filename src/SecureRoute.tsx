/*
 * Copyright (c) 2017-Present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import * as React from 'react';
import { useOktaAuth, OnAuthRequiredFunction } from './OktaContext';
import { RouteProps } from 'react-router';
import * as RR from 'react-router-dom';
import { toRelativeUrl } from '@okta/okta-auth-js';
import OktaError from './OktaError';
const { Route } = RR;

const SecureRoute: React.FC<{
  onAuthRequired?: OnAuthRequiredFunction;
  errorComponent?: React.FC<{ error: Error }>;
} & RouteProps & React.HTMLAttributes<HTMLDivElement>> = ({
  onAuthRequired,
  errorComponent,
  ...routeProps
}) => {
  const navigate = RR.useNavigate();
  const { oktaAuth, authState, _onAuthRequired } = useOktaAuth();
  const pendingLogin = React.useRef(false);
  const [handleLoginError, setHandleLoginError] = React.useState<Error | null>(null);
  const ErrorReporter = errorComponent || OktaError;

  React.useEffect(() => {
    const handleLogin = async () => {
      if (pendingLogin.current) {
        return;
      }

      pendingLogin.current = true;

      const originalUri = toRelativeUrl(window.location.href, window.location.origin);
      oktaAuth.setOriginalUri(originalUri);
      const onAuthRequiredFn = onAuthRequired || _onAuthRequired;
      if (onAuthRequiredFn) {
        await onAuthRequiredFn(oktaAuth);
      } else {
        await oktaAuth.signInWithRedirect();
      }
    };

    // Only process logic if the route matches
    if (!routeProps.path) {
      return;
    }

    if (!authState) {
      return;
    }

    if (authState.isAuthenticated) {
      pendingLogin.current = false;
      return;
    }

    // Start login if the app has decided it is not logged in and there is no pending signin
    if (!authState.isAuthenticated) {
      handleLogin().catch((err) => {
        setHandleLoginError(err as Error);
      });
    }
  }, [authState, oktaAuth, onAuthRequired, _onAuthRequired, routeProps.path]);

  if (handleLoginError) {
    return <ErrorReporter error={handleLoginError} />;
  }

  if (!authState || !authState.isAuthenticated) {
    return null;
  }

  return (
    <RR.Routes>
      <Route
        { ...routeProps }
      />
    </RR.Routes>
    
  );
};

export default SecureRoute;
