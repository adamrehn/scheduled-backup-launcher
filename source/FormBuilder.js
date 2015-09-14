/*
//  Scheduled Backup Launcher
//  Copyright (c) 2011-2015, Adam Rehn
//  
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//  
//  The above copyright notice and this permission notice shall be included in all
//  copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.
*/
$ = require('jquery');

function FormBuilder() {}

FormBuilder.build = function(tableElem, fields, defaultValues, options)
{
	//Store the supplied options (if any)
	this.options = ((options !== undefined) ? options : {});
	
	//Build the table header
	FormBuilder.buildHeader(tableElem, fields);
	
	//Generate the row generation function
	var rowGenFunc = FormBuilder.buildRowGenFunc(tableElem, fields, this.options.change, this.options.remButton);
	
	//Build the table body
	var tbody = $(document.createElement('tbody')).appendTo(tableElem);
	defaultValues.forEach(function(value) {
		tbody.append( rowGenFunc(value) );
	});
	
	//Unless requested otherwise, generate the 'add row' button
	if (this.options.addButton === undefined || this.options.addButton != false)
	{
		var addButton = $(document.createElement('button')).text('+');
		tableElem.after(addButton);
		addButton.click(function()
		{
			tbody.append( rowGenFunc({}) );
			FormBuilder.tableHideHelper(tableElem);
			
			//If a row change handler was supplied, invoke it
			if (this.options.change !== undefined) {
				this.options.change();
			}
		});
	}
	
	//Hide the table if it is currently empty
	FormBuilder.tableHideHelper(tableElem);
	
	//Return a handle that can be used to retrieve the form values from the table
	return {
		'getValues': function() {
			return FormBuilder.getValues(tableElem, fields);
		}
	};
}

//Helper function for hiding tables when they contain no rows
FormBuilder.tableHideHelper = function(tableElem)
{
	//Determine if the table contains any rows
	if ($('tbody tr', tableElem).length > 0) {
		tableElem.show();
	}
	else {
		tableElem.hide();
	}
}

//Builds the table header
FormBuilder.buildHeader = function(tableElem, fields)
{
	var thead = $(document.createElement('thead'));
	var tr    = $(document.createElement('tr'));
	
	Object.keys(fields).forEach(function(field)
	{
		var th = $(document.createElement('th')).text(fields[field].label);
		tr.append(th);
	});
	
	//Create an empty header cell for the row deletion button
	tr.append($(document.createElement('th')));
	thead.append(tr);
	tableElem.append(thead);
}

//Builds the row generation function
FormBuilder.buildRowGenFunc = function(tableElem, fields, rowChangeHandler, remButton)
{
	return function(values)
	{
		var tr = $(document.createElement('tr'));
		
		//Build the table cell for each field
		Object.keys(fields).forEach(function(fieldName)
		{
			//Create the table cell, marking it with the field name
			var td = $(document.createElement('td')).attr('fieldname', fieldName).appendTo(tr);
			
			//Populate the table cell based on the field type
			var field = fields[fieldName];
			if (field.type == 'static')
			{
				//Populate the table cell with the supplied static text
				td.text(values[fieldName]);
			}
			else if (field.type == 'text' || field.type == 'time')
			{
				//Create the input field
				var input = $(document.createElement('input')).attr('type', field.type);
				td.append(input);
				
				//If a change handler was supplied, register it and call it
				if (field.change !== undefined)
				{
					input.change(field.change);
					input.trigger('change');
				}
				
				//If a default value was supplied, apply it
				var value = values[fieldName];
				if (value !== undefined) {
					input.val(value);
				}
			}
			else if (field.type == 'select')
			{
				//Create the dropdown
				var select = $(document.createElement('select')).appendTo(td);
				var seenOptions = [];
				field.options.forEach(function(option)
				{
					if (option.length > 0 && seenOptions.indexOf(option) == -1)
					{
						//Create the current option element
						var optionElem = $(document.createElement('option')).appendTo(select);
						optionElem.attr('value', option);
						optionElem.text(option);
						
						//Keep track of the encountered options, so we can avoid duplicates
						seenOptions.push(option);
						
						//If a default value was supplied, apply it
						var value = values[fieldName];
						if (value !== undefined && value == option) {
							optionElem.attr('selected', 'selected');
						}
					}
				});
				
				//If a change handler was supplied, register it and call it
				if (field.change !== undefined)
				{
					select.change(field.change);
					select.trigger('change');
				}
			}
			else if (field.type == 'checkbox')
			{
				//Create the checkbox
				var input = $(document.createElement('input')).attr('type', 'checkbox')
				td.append(input);
				
				//If a change handler was supplied, register it and call it
				if (field.change !== undefined)
				{
					input.change(field.change);
					input.trigger('change');
				}
				
				//If a default value was supplied, apply it
				var value = values[fieldName];
				if (value !== undefined && value == true) {
					input.attr('checked', 'checked');
				}
			}
			else if (field.type == 'button')
			{
				//Create the custom button
				var button = $(document.createElement('button')).appendTo(td);
				button.text(field.buttonLabel);
				button.click(function() {
					field.buttonHandler( button );
				});
				
				//If a default value was supplied, apply it
				var value = values[fieldName];
				value = ((value !== undefined) ? value : '');
				button.attr('value', value);
			}
		});
		
		//Unless requested otherwise, build the table cell for the row deletion button
		if (remButton === undefined || remButton != false)
		{
			var delButton = $(document.createElement('button')).text('-');
			tr.append($(document.createElement('td')).append(delButton));
			delButton.click(function()
			{
				tr.remove();
				FormBuilder.tableHideHelper(tableElem);
				
				//If a row change handler was supplied, invoke it
				if (rowChangeHandler !== undefined) {
					rowChangeHandler();
				}
			});
		}
		
		return tr;
	};
}

FormBuilder.getValues = function(tableElem, fields)
{
	var that = this;
	var values = [];
	var fieldNames = Object.keys(fields);
	
	//Iterate over each table row
	tableElem.find('> tbody > tr').each(function(index, row)
	{
		//Verify that the number of cells matches our fields (plus one for the remove button, if we're using it)
		var cells = $(row).find('> td');
		if (cells.length == fieldNames.length + ((that.options.remButton === undefined || that.options.remButton != false) ? 1 : 0))
		{
			var rowVals = {};
			
			//Iterate over the table cells
			for (var i = 0; i < fieldNames.length; ++i)
			{
				//Retrieve the value from the input element
				var elem  = $(cells.get(i)).find('input, select, radio, textarea, button').first();
				var value = elem.val();
				if (elem.attr('type') == 'checkbox') {
					value = elem.is(':checked');
				}
				
				rowVals[ fieldNames[i] ] = value;
			}
			
			values.push(rowVals);
		}
	});
	
	return values;
}
