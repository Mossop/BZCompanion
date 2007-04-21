/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bugzilla Companion.
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var BZCompanionOverlay = {

get stringbundle()
{
  return document.getElementById("bundle_bzcompanion");
},

init: function()
{
  BZCompanion.init();
  gBrowser.addEventListener("pageshow", this, true);
  window.addEventListener("unload", this, false);
},

destroy: function()
{
  gBrowser.removeEventListener("pageshow", this, true);
},

bugzillaLoad: function(document)
{
},

pageLoad: function(event)
{
  if ((event.originalTarget instanceof HTMLDocument) &&
      (!event.originalTarget.defaultView.frameElement))
  {
    var doc = event.originalTarget;
    if (BZCompanion.isKnownBugzilla(doc.location))
      this.bugzillaLoad(doc);
    else if (BZCompanion.isPossibleBugzilla(doc.location))
    {
      var browser = gBrowser.getBrowserForDocument(doc)
      if (browser)
      {
        var notifier = gBrowser.getNotificationBox(browser);
        var config = BZCompanion.getConfigForLocation(doc.location);
        var message;
        if (config)
          message = this.stringbundle.getFormattedString("detect.custombugzilla", [config.name]);
        else
          message = this.stringbundle.getString("detect.stockbugzilla");
        var buttons = [
          {
            accessKey: this.stringbundle.getString("detect.yes.accesskey"),
            label: this.stringbundle.getString("detect.yes.label"),
            callback: function(notification) { BZCompanion.addLocation(doc.location); notification.close(); }
          },
          {
            accessKey: this.stringbundle.getString("detect.no.accesskey"),
            label: this.stringbundle.getString("detect.no.label"),
            callback: function(notification) { BZCompanion.ignoreLocation(doc.location); notification.close(); }
          }
        ];
        notifier.appendNotification(message, "bzcheckbugzilla", null, notifier.PRIORITY_INFO_MEDIUM, buttons);
      }
    }
  }
},

handleEvent: function(event)
{
  switch (event.type)
  {
    case "load":
      this.init();
      window.removeEventListener("load", this, false);
      break;
    case "pageshow":
      this.pageLoad(event);
      break;
    case "unload":
      this.destroy();
      break;
  }
}
}

window.addEventListener("load", BZCompanionOverlay, false);
