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

const Ci = Components.interfaces;
const Cc = Components.classes;

const gIOS = Cc["@mozilla.org/network/io-service;1"]
              .getService(Ci.nsIIOService);

function BZSettings(id, settings, service)
{
  this.id = id;
  this.settings = settings;
  this.service = service;
  this.configs = service.configs;
}

BZSettings.prototype = {

id: null,
settings: null,
configs: null,
service: null,

get urlbase()
{
  var base = this.getValue("urlbase");
  if (base)
    return gIOS.newURI(base, null, null);
  return null;
},

get name()
{
  return this.getValue("name");
},

set name(value)
{
  this.setValue("name", value);
},

get ignored()
{
  if (this.settings.ignored)
    return true;
  else
    return false;
},

set ignored(value)
{
  this.settings.ignored = value;
},

getValue: function(name)
{
  var source = this.settings;
  while (source)
  {
    if (source[name])
      return source[name];
    source = this.configs[source.parent];
  }
  return null;
},

setValue: function(name, value)
{
  if (value)
    this.settings[name] = value;
  else
    delete this.settings[name];
},

QueryInterface: function(iid)
{
  if (iid.equals(Ci.bzcISettings)
    || iid.equals(Ci.nsISupports))
    return this;
  else
    throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var BZSettingsService = {

configs: {
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
  this._readSettingsFile();
},

createSettingsForURI: function(uri, defaults)
{
  var installation = {
    urlbase: uri.spec
  };
  if (defaults)
    installation.parent = defaults.id;
  this.settings.push(installation);
  return new BZSettings(null, installation, this);
},

getSettingsForURI: function(uri)
{
  for (var i = 0; i < this.settings.length; i++)
  {
    var base = uri.spec.substring(0, this.settings[i].urlbase.length);
    if (this.settings[i].urlbase == base)
      return new BZSettings(null, this.settings[i], this);
  }
  return null;
},

getDefaultsForURI: function(uri)
{
  for (var i in this.configs)
  {
    if (this.configs[i].urlbase)
    {
      var base = uri.spec.substring(0, this.configs[i].urlbase.length);
      if (this.configs[i].urlbase == base)
        return new BZSettings(i, this.configs[i], this);
    }
  }
  return null;
},

getDefaultsForVersion: function(version)
{
  return new BZSettings("_default", this.configs._default, this);
},

flushSettings: function()
{
  this._writeSettingsFile();
},

_readSettingsFile: function()
{
  if (this.settingsFile.exists())
  {
    try
    {
      var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                             .createInstance(Components.interfaces.nsIFileInputStream);
      stream.init(this.settingsFile, 0x01, 0, 0);
      var cvstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                               .createInstance(Components.interfaces.nsIConverterInputStream);
      cvstream.init(stream, "UTF-8", 1024, Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
      
      var content = "";
      var data = {};
      while (cvstream.readString(4096, data))
        content += data.value;
      cvstream.close();
      
      content = content.replace(/\r\n?/g, "\n");
      var sandbox = new Components.utils.Sandbox("about:blank");
      var settings = Components.utils.evalInSandbox(content, sandbox);
      if (settings.version == BZ_SETTINGS_VERSION)
        this.settings = settings.installations;
    }
    catch (ex) { } // inexisting file?
  }
},

_writeSettingsFile: function()
{
  if (this.settings.length > 0)
  {
    var settings = {
      version: BZ_SETTINGS_VERSION,
      installations: null
    };
    settings.installations = this.settings;
  
    // init stream
    var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
                           .createInstance(Components.interfaces.nsIFileOutputStream);
    stream.init(this.settingsFile, 0x02 | 0x08 | 0x20, 0600, 0);
  
    // convert to UTF-8
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var convertedData = converter.ConvertFromUnicode(settings.toSource());
    convertedData += converter.Finish();
  
    // write and close stream
    stream.write(convertedData, convertedData.length);
    if (stream instanceof Components.interfaces.nsISafeOutputStream)
      stream.finish();
    else
      stream.close();
  }
  else
    this.settingsFile.remove(true);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.bzcISettingsService)
		|| iid.equals(Ci.nsISupports))
		return this;
	else
		throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var initModule =
{
  ServiceCID: Components.ID("{533ac545-819a-4390-9da7-5617f337eaf2}"),
  ServiceContractID: "@blueprintit.co.uk/bzcsettings;1",
  ServiceName: "Bugzilla Companion Settings",
  
  registerSelf: function (compMgr, fileSpec, location, type)
  {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
      fileSpec,location,type);
  },

  unregisterSelf: function (compMgr, fileSpec, location)
  {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
  },

  getClassObject: function (compMgr, cid, iid)
  {
    if (!cid.equals(this.ServiceCID))
      throw Components.results.NS_ERROR_NO_INTERFACE
    if (!iid.equals(Ci.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    return this.instanceFactory;
  },

  canUnload: function(compMgr)
  {
    return true;
  },

  instanceFactory:
  {
    createInstance: function (outer, iid)
    {
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      BZSettingsService.init();
      return BZSettingsService.QueryInterface(iid);
    }
  }
}; //Module

function NSGetModule(compMgr, fileSpec)
{
  return initModule;
}
