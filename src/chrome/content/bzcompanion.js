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

#define BZ_SETTINGS_VERSION 1

var BZCompanion = {

urlbaseRegExp: /^(.*\/)(?:show_bug\.cgi|query\.cgi|buglist\.cgi|enter_bug\.cgi)$/,

config: {
#include "configuration.inc"
},

settingsFile: null,
settings: [],

init: function()
{
  var dirService = Components.classes["@mozilla.org/file/directory_service;1"]
                             .getService(Components.interfaces.nsIProperties);
	this.settingsFile = dirService.get("ProfD", Ci.nsILocalFile);
	this.settingsFile.append("bzcompanion.js");
  if (this.settingsFile.exists())
  {
    var filedata = this.readFile(this.settingsFile);
    var sandbox = new Components.utils.Sandbox("about:blank");
    var settings = Components.utils.evalInSandbox(filedata, sandbox);
    if (settings.version == BZ_SETTINGS_VERSION)
      this.settings = settings.installations;
  }
},

isKnownBugzilla: function(location)
{
  var settings = this.getKnownBugzilla(location);
  if (settings)
    return true;
  return false;
},

getKnownBugzilla: function(location)
{
  for (var i = 0; i < this.settings.length; i++)
  {
    var base = location.href.substring(0, this.settings[i].urlbase.length);
    if (this.settings[i].urlbase == base)
      return this.settings[i];
  }
  return null;
},

getConfigForLocation: function(location)
{
  for (var i in this.config)
  {
    if (this.config[i].urlbase)
    {
      var base = location.href.substring(0, this.config[i].urlbase.length);
      if (this.config[i].urlbase == base)
        return this.config[i];
    }
  }
  return null;
},

isPossibleBugzilla: function(location)
{
  if (this.urlbaseRegExp.test(location.pathname))
    return true;
  return false;
},

guessUrlBase: function(location)
{
  var matches = this.urlbaseRegExp.exec(location.pathname);
  if (matches)
    return location.protocol+"//"+location.host+matches[1];
  return null;
},

addLocation: function(location)
{
  var base = this.guessUrlBase(location);
  if (base)
  {
  }
},

ignoreLocation: function(location)
{
  var base = this.guessUrlBase(location);
  if (base)
  {
    var installation = {
      urlbase: base,
      ignored: true
    };
    this.settings.push(installation);
    this.flushSettings();
  }
},

flushSettings: function()
{
  if (this.settings.length > 0)
  {
    var settings = {
      version: BZ_SETTINGS_VERSION,
      installations: null
    };
    settings.installations = this.settings;
    this.writeFile(this.settingsFile, settings.toSource());
  }
  else
    this.settingsFile.remove(true);
},

readFile: function(file)
{
  try {
    var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                           .createInstance(Components.interfaces.nsIFileInputStream);
    stream.init(file, 0x01, 0, 0);
    var cvstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                             .createInstance(Components.interfaces.nsIConverterInputStream);
    cvstream.init(stream, "UTF-8", 1024, Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    
    var content = "";
    var data = {};
    while (cvstream.readString(4096, data)) {
      content += data.value;
    }
    cvstream.close();
    
    return content.replace(/\r\n?/g, "\n");
  }
  catch (ex) { } // inexisting file?
  
  return null;
},

writeFile: function sss_writeFile(file, data)
{
  // init stream
  var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);
  stream.init(file, 0x02 | 0x08 | 0x20, 0600, 0);

  // convert to UTF-8
  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var convertedData = converter.ConvertFromUnicode(data);
  convertedData += converter.Finish();

  // write and close stream
  stream.write(convertedData, convertedData.length);
  if (stream instanceof Components.interfaces.nsISafeOutputStream)
    stream.finish();
  else
    stream.close();
}
};
